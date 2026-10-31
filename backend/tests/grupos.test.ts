import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../src/config/database';
import { crearBaseAislada } from './database.fixture';
import { buscarCursoPorId } from '../src/repositorios/cursos.repository';
import { crearMatricula } from '../src/repositorios/matriculas.repository';
import { registrarCalificacion } from '../src/services/matriculas.service';
import { HttpError } from '../src/types/http-error';

test('varios grupos: calificación correcta y matrícula única por asignatura', async () => {
  const limpiar = await crearBaseAislada();
  try {
    const ids: Record<string, number> = {};
    for (const rol of ['estudiante', 'profesor']) {
      const r = await pool.query(`INSERT INTO usuarios(nombre,correo,password_hash,rol,cedula,fecha_nacimiento,fecha_ingreso,nacionalidad,genero,carrera_codigo)
        VALUES($1,$2,'hash',$1,$1,'2000-01-01',CURRENT_DATE,'Prueba','Otro',$3) RETURNING id`, [rol,`${rol}@test.example`,rol==='estudiante'?'SIV':null]);
      ids[rol] = r.rows[0].id;
    }
    await pool.query("UPDATE carreras SET prerrequisitos_verificados=TRUE WHERE codigo='SIV'");
    const grupos = [];
    for (const [codigo, horario] of [['GRUP1','Lunes 08:00 - 09:00'],['GRUP2','Martes 08:00 - 09:00']]) {
      const r = await pool.query(`INSERT INTO cursos(codigo,codigo_pensum,docente_id,horario,cupos_totales,cupos_disponibles)
        VALUES($1,'10001',$2,$3,30,30) RETURNING id`, [codigo,ids.profesor,horario]);
      const curso = await buscarCursoPorId(r.rows[0].id); assert.ok(curso); grupos.push(curso);
    }
    await crearMatricula(ids.estudiante, grupos[1]);
    const resultado = await registrarCalificacion(ids.profesor,ids.estudiante,'10001',{corte1:2,corte2:2,corte3:2});
    assert.equal(resultado.nota,2);
    await assert.rejects(crearMatricula(ids.estudiante,grupos[0]),e=>e instanceof HttpError && e.codigo==='ASIGNATURA_YA_MATRICULADA');
    // Reintentar el mismo grupo es idempotente.
    assert.equal((await crearMatricula(ids.estudiante,grupos[1])).creada,false);
    await pool.query('DELETE FROM matriculas WHERE usuario_id=$1',[ids.estudiante]);
    const paralelas = await Promise.allSettled(grupos.map(c=>crearMatricula(ids.estudiante,c)));
    assert.equal(paralelas.filter(r=>r.status==='fulfilled').length,1);
    const rechazo = paralelas.find(r=>r.status==='rejected') as PromiseRejectedResult;
    assert.equal(rechazo.reason.codigo,'ASIGNATURA_YA_MATRICULADA');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM matriculas WHERE usuario_id=$1',[ids.estudiante])).rows[0].n,1);
  } finally { await limpiar(); await pool.end(); }
});
