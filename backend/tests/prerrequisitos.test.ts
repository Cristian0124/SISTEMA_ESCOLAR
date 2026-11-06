import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { pool } from '../src/config/database';
import { JWT_ACCESS_SECRET } from '../src/config/env';
import type { ConfiguracionPensum } from '../src/repositorios/academico.repository';
import { crearCursoYAsignarDocente } from '../src/services/cursos.service';
import { crearMatricula } from '../src/services/matriculas.service';
import { crearBaseAislada } from './database.fixture';

test('revisión administrativa de prerrequisitos y habilitación del pénsum', async contexto => {
  const limpiar = await crearBaseAislada();
  let servidor: ReturnType<typeof app.listen> | undefined;
  try {
    const usuarios: Record<string, number> = {};
    for (const rol of ['admin', 'profesor', 'estudiante']) {
      const resultado = await pool.query(`INSERT INTO usuarios
        (nombre, correo, password_hash, rol, cedula, fecha_nacimiento, fecha_ingreso, nacionalidad, genero, carrera_codigo)
        VALUES($1, $2, 'hash', $1, $1, '2000-01-01', CURRENT_DATE, 'Prueba', 'Otro', $3) RETURNING id`,
      [rol, `${rol}@revision.example`, rol === 'estudiante' ? 'SIV' : null]);
      usuarios[rol] = resultado.rows[0].id;
    }
    servidor = app.listen(0);
    await once(servidor, 'listening');
    const direccion = servidor.address();
    assert.ok(direccion && typeof direccion !== 'string');
    const url = `http://127.0.0.1:${direccion.port}/api/academico/carreras/SIV/prerrequisitos`;
    const headers = (rol: string) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt.sign({ id: usuarios[rol], nombre: rol, rol }, JWT_ACCESS_SECRET)}`,
    });
    const consultar = async () => {
      const respuesta = await fetch(url, { headers: headers('admin') });
      assert.equal(respuesta.status, 200);
      return await respuesta.json() as ConfiguracionPensum;
    };
    const guardar = (datos: unknown) => fetch(url, {
      method: 'PUT', headers: headers('admin'), body: JSON.stringify(datos),
    });

    await contexto.test('exige administrador en lectura y escritura', async () => {
      for (const method of ['GET', 'PUT']) {
        assert.equal((await fetch(url, { method })).status, 401);
        for (const rol of ['estudiante', 'profesor']) {
          assert.equal((await fetch(url, { method, headers: headers(rol) })).status, 403);
        }
      }
    });

    await contexto.test('Biología de primer semestre no puede exigir Constitución Política de sexto', async () => {
      const urlBiologia = url.replace('/SIV/', '/BIO/');
      const inicialBiologia = await (await fetch(urlBiologia, { headers: headers('admin') })).json() as ConfiguracionPensum;
      const respuesta = await fetch(urlBiologia, {
        method: 'PUT', headers: headers('admin'), body: JSON.stringify({
          version: inicialBiologia.version,
          asignaturas: inicialBiologia.asignaturas.map(asignatura => ({
            codigo: asignatura.codigo,
            prerrequisitos: asignatura.codigo === '03001' ? ['03028'] : [...asignatura.prerrequisitos],
          })),
          validar: true, revisionConfirmada: true,
        }),
      });
      assert.equal(respuesta.status, 400);
      assert.equal((await respuesta.json() as { codigo: string }).codigo, 'PRERREQUISITO_POSTERIOR');
      const despues = await (await fetch(urlBiologia, { headers: headers('admin') })).json() as ConfiguracionPensum;
      assert.equal(despues.version, inicialBiologia.version);
    });

    const inicial = await consultar();
    assert.equal(inicial.prerrequisitosVerificados, false);
    assert.ok(inicial.asignaturas.length >= 3);
    const [primera, segunda, tercera] = inicial.asignaturas;
    const asignaturas = inicial.asignaturas.map(asignatura => ({
      codigo: asignatura.codigo, prerrequisitos: [] as string[],
    }));
    const base = {
      version: inicial.version, asignaturas, validar: false, revisionConfirmada: false,
    };
    const materiaAjena = await pool.query("SELECT codigo FROM materias_pensum WHERE carrera_codigo='CIV' LIMIT 1");
    const ajena: string = materiaAjena.rows[0].codigo;
    const requisitoAjeno = await pool.query("SELECT codigo FROM materias_pensum WHERE carrera_codigo='CIV' AND codigo<>$1 LIMIT 1", [ajena]);
    const codigoRequisitoAjeno: string = requisitoAjeno.rows[0].codigo;
    await pool.query('INSERT INTO prerrequisitos_materia(codigo_materia, codigo_requisito) VALUES($1, $2)', [ajena, codigoRequisitoAjeno]);

    await contexto.test('rechaza dependencias inválidas sin modificar el plan', async () => {
      const propias = asignaturas.map(asignatura => ({ ...asignatura, prerrequisitos: [asignatura.codigo] }));
      const ciclo = asignaturas.map(asignatura => ({ ...asignatura, prerrequisitos: [] as string[] }));
      ciclo[0].prerrequisitos = [segunda.codigo];
      ciclo[1].prerrequisitos = [primera.codigo];
      const extranjeras = asignaturas.map(asignatura => ({ ...asignatura, prerrequisitos: [ajena] }));
      const duplicadas = asignaturas.map(asignatura => ({ ...asignatura, prerrequisitos: [] as string[] }));
      duplicadas[0].prerrequisitos = [segunda.codigo, segunda.codigo];
      const materiaReemplazada = asignaturas.map(asignatura => ({ ...asignatura }));
      materiaReemplazada[materiaReemplazada.length - 1] = { codigo: ajena, prerrequisitos: [] };
      for (const entrada of [
        { ...base, asignaturas: propias },
        { ...base, asignaturas: ciclo },
        { ...base, asignaturas: extranjeras },
        { ...base, asignaturas: duplicadas },
        { ...base, asignaturas: materiaReemplazada },
        { ...base, asignaturas: asignaturas.slice(1) },
        { ...base, asignaturas: [...asignaturas, asignaturas[0]] },
        { ...base, validar: true },
      ]) {
        assert.equal((await guardar(entrada)).status, 400);
        assert.equal((await consultar()).version, inicial.version);
      }
    });

    await contexto.test('guarda un borrador y exige revisión actualizada antes de validar', async () => {
      asignaturas[1].prerrequisitos = [primera.codigo];
      assert.equal((await guardar(base)).status, 200);
      const borrador = await consultar();
      assert.equal(borrador.prerrequisitosVerificados, false);
      assert.deepEqual(borrador.asignaturas[1].prerrequisitos, [primera.codigo]);
      assert.notEqual(borrador.version, inicial.version);
      assert.equal((await guardar({ ...base, validar: true, revisionConfirmada: true })).status, 409);
    });

    await contexto.test('la validación habilita la matrícula con los prerrequisitos guardados', async () => {
      const curso = await crearCursoYAsignarDocente({
        codigoPensum: primera.codigo, profesorId: usuarios.profesor,
        cuposTotales: 30, sesiones: [{ dia: 1, horaInicio: '08:00', horaFin: '10:00' }],
      });
      await assert.rejects(crearMatricula(usuarios.estudiante, curso.id),
        error => (error as { codigo?: string }).codigo === 'PENSUM_PENDIENTE_VALIDACION');
      const actual = await consultar();
      assert.equal((await guardar({
        ...base, version: actual.version, validar: true, revisionConfirmada: true,
      })).status, 200);
      assert.equal((await consultar()).prerrequisitosVerificados, true);
      assert.equal((await crearMatricula(usuarios.estudiante, curso.id)).creada, true);
    });

    await contexto.test('dos ediciones simultáneas no sobreescriben cambios', async () => {
      const actual = await consultar();
      const edicion = (requisito: string) => ({
        ...base, version: actual.version, validar: true, revisionConfirmada: true,
        asignaturas: actual.asignaturas.map(asignatura => ({
          codigo: asignatura.codigo,
          prerrequisitos: asignatura.codigo === tercera.codigo ? [requisito] : [...asignatura.prerrequisitos],
        })),
      });
      const respuestas = await Promise.all([guardar(edicion(primera.codigo)), guardar(edicion(segunda.codigo))]);
      assert.deepEqual(respuestas.map(respuesta => respuesta.status).sort(), [200, 409]);
      const guardada = await consultar();
      assert.equal(guardada.asignaturas[2].prerrequisitos.length, 1);
      const otraCarrera = await pool.query('SELECT codigo_requisito FROM prerrequisitos_materia WHERE codigo_materia=$1', [ajena]);
      assert.deepEqual(otraCarrera.rows, [{ codigo_requisito: codigoRequisitoAjeno }]);
    });
  } finally {
    if (servidor) await new Promise<void>((resolve, reject) => servidor!.close(error => error ? reject(error) : resolve()));
    await limpiar();
    await pool.end();
  }
});
