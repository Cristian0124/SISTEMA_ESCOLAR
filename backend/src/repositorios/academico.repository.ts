import { pool } from '../config/database';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { RevisionPensum } from '../schemas/academico.schema';
import { HttpError } from '../types/http-error';

export async function listarFacultades() {
  return (await pool.query('SELECT codigo, nombre FROM facultades ORDER BY nombre')).rows;
}

export async function listarCarreras() {
  return (await pool.query(`SELECT c.codigo, c.nombre, c.nivel, c.modalidad,
    c.facultad_codigo AS "facultadCodigo", f.nombre AS facultad,
    c.fuente, c.consultado_en AS "consultadoEn",
    c.prerrequisitos_verificados AS "prerrequisitosVerificados",
    COUNT(m.codigo)::integer AS asignaturas, COALESCE(SUM(m.creditos), 0)::integer AS creditos
    FROM carreras c JOIN facultades f ON f.codigo = c.facultad_codigo
    LEFT JOIN materias_pensum m ON m.carrera_codigo = c.codigo
    GROUP BY c.codigo, f.codigo ORDER BY c.nivel, c.nombre`)).rows;
}

export async function existeCarrera(codigo: string): Promise<boolean> {
  return Boolean((await pool.query('SELECT 1 FROM carreras WHERE codigo=$1', [codigo])).rowCount);
}

export async function consultarPensum(codigo: string) {
  return (await pool.query(`SELECT codigo, nombre, semestre, creditos FROM materias_pensum
    WHERE carrera_codigo=$1 ORDER BY semestre, codigo`, [codigo])).rows;
}

export async function listarEstudiantesSinCarrera() {
  return (await pool.query(`SELECT id, nombre, cedula FROM usuarios
    WHERE rol='estudiante' AND carrera_codigo IS NULL ORDER BY nombre, id`)).rows;
}

export async function asignarCarreraInicial(usuarioId: number, carreraCodigo: string) {
  const resultado = await pool.query(`UPDATE usuarios SET carrera_codigo=$2
    WHERE id=$1 AND rol='estudiante' AND carrera_codigo IS NULL
    RETURNING id, carrera_codigo AS "carreraCodigo"`, [usuarioId, carreraCodigo]);
  return resultado.rows[0];
}

export interface ConfiguracionPensum {
  codigo: string;
  nombre: string;
  prerrequisitosVerificados: boolean;
  asignaturas: {
    codigo: string;
    nombre: string;
    semestre: number;
    creditos: number;
    prerrequisitos: string[];
  }[];
  version: string;
}

async function leerRevisionPensum(
  codigo: string,
  cliente: Pick<PoolClient, 'query'>,
): Promise<ConfiguracionPensum | undefined> {
  const resultado = await cliente.query<Omit<ConfiguracionPensum, 'version'>>(`
    SELECT c.codigo, c.nombre, c.prerrequisitos_verificados AS "prerrequisitosVerificados",
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'codigo', m.codigo, 'nombre', m.nombre, 'semestre', m.semestre, 'creditos', m.creditos,
        'prerrequisitos', COALESCE((SELECT jsonb_agg(p.codigo_requisito ORDER BY p.codigo_requisito)
          FROM prerrequisitos_materia p WHERE p.codigo_materia=m.codigo), '[]'::jsonb)
      ) ORDER BY m.semestre, m.codigo) FROM materias_pensum m WHERE m.carrera_codigo=c.codigo), '[]'::jsonb) AS asignaturas
    FROM carreras c WHERE c.codigo=$1`, [codigo]);
  const revision = resultado.rows[0];
  if (!revision) return undefined;
  const version = createHash('sha256').update(JSON.stringify({
    codigo: revision.codigo,
    nombre: revision.nombre,
    validado: revision.prerrequisitosVerificados,
    asignaturas: revision.asignaturas.map(materia => [
      materia.codigo, materia.nombre, materia.semestre, materia.creditos, materia.prerrequisitos,
    ]),
  })).digest('hex');
  return { ...revision, version };
}

export function consultarRevisionPensum(codigo: string) {
  return leerRevisionPensum(codigo, pool);
}

export async function guardarRevisionPensum(codigo: string, datos: RevisionPensum): Promise<ConfiguracionPensum> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('SELECT codigo FROM carreras WHERE codigo=$1 FOR UPDATE', [codigo]);
    const actual = await leerRevisionPensum(codigo, cliente);
    if (!actual) throw new HttpError(404, 'CARRERA_NO_ENCONTRADA', 'Carrera no encontrada.');
    if (actual.version !== datos.version) {
      throw new HttpError(409, 'PENSUM_MODIFICADO', 'El pénsum cambió desde que lo abriste. Recarga la revisión antes de guardar.');
    }
    const materias = new Map(actual.asignaturas.map(asignatura => [asignatura.codigo, asignatura]));
    if (datos.asignaturas.length !== materias.size || datos.asignaturas.some(asignatura => !materias.has(asignatura.codigo))) {
      throw new HttpError(400, 'ASIGNATURAS_INVALIDAS', 'La revisión debe incluir exactamente las asignaturas de esta carrera.');
    }
    for (const asignatura of datos.asignaturas) {
      const materia = materias.get(asignatura.codigo)!;
      for (const codigoRequisito of asignatura.prerrequisitos) {
        const requisito = materias.get(codigoRequisito);
        if (!requisito) {
          throw new HttpError(400, 'PRERREQUISITO_AJENO', `El prerrequisito ${codigoRequisito} debe pertenecer a esta carrera.`);
        }
        if (requisito.semestre > materia.semestre) {
          throw new HttpError(400, 'PRERREQUISITO_POSTERIOR',
            `${materia.codigo} · ${materia.nombre} es de semestre ${materia.semestre} y no puede exigir ${requisito.codigo} · ${requisito.nombre}, de semestre ${requisito.semestre}.`);
        }
      }
    }
    await cliente.query(`DELETE FROM prerrequisitos_materia p USING materias_pensum m
      WHERE p.codigo_materia=m.codigo AND m.carrera_codigo=$1`, [codigo]);
    const relaciones = datos.asignaturas.flatMap(asignatura => asignatura.prerrequisitos.map(requisito => ({
      codigo_materia: asignatura.codigo,
      codigo_requisito: requisito,
    })));
    await cliente.query(`INSERT INTO prerrequisitos_materia(codigo_materia, codigo_requisito)
      SELECT codigo_materia, codigo_requisito FROM jsonb_to_recordset($1::jsonb)
      AS relacion(codigo_materia varchar(5), codigo_requisito varchar(5))`, [JSON.stringify(relaciones)]);
    await cliente.query('UPDATE carreras SET prerrequisitos_verificados=$2 WHERE codigo=$1', [codigo, datos.validar]);
    const guardada = await leerRevisionPensum(codigo, cliente);
    if (!guardada) throw new Error('No se pudo recuperar la revisión guardada.');
    await cliente.query('COMMIT');
    return guardada;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
