import { pool } from "../config/database";

export interface ResumenMatricula {
  estudiante: { id: number; nombre: string; cedula: string; carrera: string | null };
  periodo: string;
  cursos: { codigo: string; nombre: string; horario: string; creditos: number }[];
  totalCreditos: number;
}

export async function consultarResumenMatricula(usuarioId: number): Promise<ResumenMatricula | null> {
  // Una sola sentencia mantiene consistente el periodo, los cursos y el total.
  // No usa el JSON histórico de la matrícula ni datos enviados por el navegador.
  const resultado = await pool.query<ResumenMatricula>(
    `WITH periodo_actual AS (
       SELECT to_char(CURRENT_DATE, 'YYYY') || CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '-1' ELSE '-2' END AS periodo
     )
     SELECT jsonb_build_object('id', u.id, 'nombre', u.nombre, 'cedula', u.cedula,
              'carrera', carrera.nombre) AS estudiante,
            p.periodo,
            COALESCE(jsonb_agg(jsonb_build_object(
              'codigo', c.codigo, 'nombre', materia.nombre, 'horario', COALESCE((
                SELECT string_agg(
                  (ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])[h.dia]
                  || ' ' || to_char(h.hora_inicio, 'HH24:MI') || ' - ' || to_char(h.hora_fin, 'HH24:MI'),
                  '; ' ORDER BY h.dia, h.hora_inicio)
                FROM curso_horarios h WHERE h.curso_id = c.id
              ), c.horario),
              'creditos', materia.creditos) ORDER BY c.codigo) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb) AS cursos,
            COALESCE(SUM(materia.creditos), 0)::integer AS "totalCreditos"
     FROM usuarios u CROSS JOIN periodo_actual p
     LEFT JOIN carreras carrera ON carrera.codigo = u.carrera_codigo
     LEFT JOIN matriculas m ON m.usuario_id = u.id AND m.estado = 'Activa' AND m.periodo = p.periodo
     LEFT JOIN cursos c ON c.id = m.curso_id
     LEFT JOIN materias_pensum materia ON materia.codigo = c.codigo_pensum
     WHERE u.id = $1 AND u.activo = TRUE AND u.rol = 'estudiante'
     GROUP BY u.id, carrera.nombre, p.periodo`, [usuarioId]
  );
  return resultado.rows[0] ?? null;
}
