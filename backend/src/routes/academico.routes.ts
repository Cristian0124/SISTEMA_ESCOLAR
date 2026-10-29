import { Router } from "express";
import { pool } from "../config/database";
import { autenticar, autorizar } from "../middlewares/auth.middleware";
import { z } from "zod";

const router = Router();

router.get("/facultades", async (_req, res) => {
  res.json((await pool.query("SELECT codigo, nombre FROM facultades ORDER BY nombre")).rows);
});
router.get("/carreras", async (_req, res) => {
  res.json((await pool.query(`SELECT c.codigo, c.nombre, c.nivel, c.modalidad,
    c.facultad_codigo AS "facultadCodigo", f.nombre AS facultad,
    c.fuente, c.consultado_en AS "consultadoEn",
    c.prerrequisitos_verificados AS "prerrequisitosVerificados",
    COUNT(m.codigo)::integer AS asignaturas, COALESCE(SUM(m.creditos), 0)::integer AS creditos
    FROM carreras c JOIN facultades f ON f.codigo = c.facultad_codigo
    LEFT JOIN materias_pensum m ON m.carrera_codigo = c.codigo
    GROUP BY c.codigo, f.codigo ORDER BY c.nivel, c.nombre`)).rows);
});
router.get("/carreras/:codigo/pensum", async (req, res) => {
  const carrera = await pool.query("SELECT codigo FROM carreras WHERE codigo = $1", [req.params.codigo]);
  if (!carrera.rowCount) { res.status(404).json({ mensaje: "Carrera no encontrada" }); return; }
  res.json((await pool.query(`SELECT codigo, nombre, semestre, creditos FROM materias_pensum
    WHERE carrera_codigo = $1 ORDER BY semestre, codigo`, [req.params.codigo])).rows);
});

// Asignación explícita de estudiantes anteriores, sin inferir ni trasladar notas.
router.get("/estudiantes/sin-carrera", autenticar, autorizar("admin"), async (_req, res) => {
  res.json((await pool.query(`SELECT id, nombre, cedula FROM usuarios
    WHERE rol = 'estudiante' AND carrera_codigo IS NULL ORDER BY nombre, id`)).rows);
});
router.patch("/estudiantes/:id/carrera", autenticar, autorizar("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const datos = z.object({ carreraCodigo: z.string().min(1).max(10) }).strict().safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !datos.success) {
    res.status(400).json({ mensaje: "Selecciona un estudiante y una carrera válidos" }); return;
  }
  const carrera = await pool.query("SELECT 1 FROM carreras WHERE codigo = $1", [datos.data.carreraCodigo]);
  if (!carrera.rowCount) { res.status(400).json({ mensaje: "Carrera no válida" }); return; }
  const resultado = await pool.query(`UPDATE usuarios SET carrera_codigo = $2
    WHERE id = $1 AND rol = 'estudiante' AND carrera_codigo IS NULL
    RETURNING id, carrera_codigo AS "carreraCodigo"`, [id, datos.data.carreraCodigo]);
  if (!resultado.rowCount) { res.status(409).json({ mensaje: "El estudiante no existe o ya tiene carrera asignada" }); return; }
  res.json(resultado.rows[0]);
});
export default router;
