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

    const limite = await cliente.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM cursos WHERE id = $1 FOR UPDATE",
      [curso.id]
    );
    if (!limite.rows[0]) {
      throw new HttpError(404, "CURSO_NO_ENCONTRADO", "El curso seleccionado ya no existe");
    }

    const aprobada = await cliente.query(
      `SELECT 1 FROM calificaciones
       WHERE usuario_id = $1 AND codigo_materia = $2 AND nota >= 3.0
       LIMIT 1`,
      [usuarioId, curso.codigoPensum]
    );
    if (aprobada.rowCount) {
      throw new HttpError(409, "MATERIA_YA_APROBADA", "Ya aprobaste esta materia y no puedes matricularla de nuevo");
    }

    const requisitosPendientes = await cliente.query<{ codigo_requisito: string }>(
      `SELECT prerrequisito.codigo_requisito
       FROM prerrequisitos_materia AS prerrequisito
       LEFT JOIN calificaciones AS calificacion
         ON calificacion.usuario_id = $1
         AND calificacion.codigo_materia = prerrequisito.codigo_requisito
         AND calificacion.nota >= 3.0
       WHERE prerrequisito.codigo_materia = $2
         AND calificacion.usuario_id IS NULL
       ORDER BY prerrequisito.codigo_requisito`,
      [usuarioId, curso.codigoPensum]
    );
    if (requisitosPendientes.rowCount) {
      const codigos = requisitosPendientes.rows.map((fila) => fila.codigo_requisito);
      throw new HttpError(409, "PRERREQUISITOS_PENDIENTES", `Debes aprobar primero: ${codigos.join(", ")}`);
    }

    const ocupacion = await cliente.query<{ cantidad: number }>(
      `SELECT COUNT(*)::integer AS cantidad
       FROM matriculas
       WHERE curso_id = $1 AND estado = 'Activa'`,
      [curso.id]
    );

    const cantidad = ocupacion.rows[0].cantidad;

    // cupos_disponibles stores the enrollment limit; the catalog subtracts active registrations.
    if (cantidad >= limite.rows[0].cupos_disponibles) {
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
