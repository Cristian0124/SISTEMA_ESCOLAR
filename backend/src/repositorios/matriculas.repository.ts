import { pool } from "../config/database";
import type { Curso } from "./cursos.repository";
import { HttpError } from "../types/http-error";

interface Matricula {
  id: number;
  curso: Curso;
  estado: string;
  fecha: Date;
}

export interface EstudianteMatriculado {
  id: number;
  nombre: string;
  cedula: string;
  nota: number | null;
}

export async function crearMatricula(
  usuarioId: number,
  curso: Curso
): Promise<{ creada: boolean; matricula: Matricula }> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Serializa las inscripciones del mismo curso.
    // Evita que dos solicitudes ocupen el último cupo a la vez.
    await cliente.query(
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
      [20261017, curso.id]
    );

    const existente = await cliente.query<Matricula>(
      `SELECT id, curso, estado, fecha
       FROM matriculas
       WHERE usuario_id = $1 AND curso_id = $2`,
      [usuarioId, curso.id]
    );

    const matriculaExistente = existente.rows[0];

    if (matriculaExistente) {
      await cliente.query("COMMIT");

      return {
        creada: false,
        matricula: matriculaExistente
      };
    }

    const ocupacion = await cliente.query<{ cantidad: number }>(
      `SELECT COUNT(*)::integer AS cantidad
       FROM matriculas
       WHERE curso_id = $1`,
      [curso.id]
    );

    const cantidad = ocupacion.rows[0].cantidad;

    // El catálogo actual contiene los cupos disponibles iniciales.
    if (cantidad >= curso.cuposDisponibles) {
      throw new HttpError(
        409,
        "SIN_CUPOS",
        "El curso ya no tiene cupos disponibles"
      );
    }

    const resultado = await cliente.query<Matricula>(
      `INSERT INTO matriculas (
         usuario_id,
         curso_id,
         curso
       )
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, curso, estado, fecha`,
      [usuarioId, curso.id, JSON.stringify(curso)]
    );

    await cliente.query("COMMIT");

    return {
      creada: true,
      matricula: resultado.rows[0]
    };
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarEstudiantesPorCurso(
  cursoId: number,
  codigoMateria: string
): Promise<EstudianteMatriculado[]> {
  const resultado = await pool.query<Omit<EstudianteMatriculado, "nota"> & { nota: string | null }>(
    `SELECT usuario.id, usuario.nombre, usuario.cedula, calificacion.nota::text AS nota
     FROM matriculas AS matricula
     JOIN usuarios AS usuario ON usuario.id = matricula.usuario_id
     LEFT JOIN calificaciones AS calificacion
       ON calificacion.usuario_id = usuario.id
       AND calificacion.codigo_materia = $2
     WHERE matricula.curso_id = $1
       AND matricula.estado = 'Activa'
       AND usuario.rol = 'estudiante'
       AND usuario.activo = TRUE
     ORDER BY usuario.nombre, usuario.id`,
    [cursoId, codigoMateria]
  );

  return resultado.rows.map((estudiante) => ({
    ...estudiante,
    nota: estudiante.nota === null ? null : Number(estudiante.nota)
  }));
}

export async function estaMatriculadoEnCurso(usuarioId: number, cursoId: number): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1 FROM matriculas
     WHERE usuario_id = $1 AND curso_id = $2 AND estado = 'Activa'
     LIMIT 1`,
    [usuarioId, cursoId]
  );
  return resultado.rowCount !== 0;
}

export async function listarPorEstudiante(
  usuarioId: number
): Promise<Matricula[]> {
  const resultado = await pool.query<Matricula>(
    `SELECT id, curso, estado, fecha
     FROM matriculas
     WHERE usuario_id = $1
     ORDER BY fecha DESC, id DESC`,
    [usuarioId]
  );

  return resultado.rows;
}

export async function eliminarMatricula(
  usuarioId: number,
  matriculaId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `DELETE FROM matriculas
     WHERE id = $1 AND usuario_id = $2
     RETURNING id`,
    [matriculaId, usuarioId]
  );

  return (resultado.rowCount ?? 0) > 0;
}
