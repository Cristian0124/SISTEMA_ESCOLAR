import { Router } from "express";
import {
  crearMatricula,
  eliminarMatricula,
  listarMisMatriculas,
  obtenerAvancePensum,
  registrarCalificacion,
  listarCursosDocente,
  listarEstudiantesDeCursoDocente
} from "../controllers/matriculas.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.use(autenticar);
router.post("/", crearMatricula);
router.get("/mias", listarMisMatriculas);
router.get("/avance", obtenerAvancePensum);
router.get("/docente/cursos", autorizar("profesor"), listarCursosDocente);
router.get("/docente/cursos/:cursoId/estudiantes", autorizar("profesor"), listarEstudiantesDeCursoDocente);
router.put("/calificaciones/:usuarioId/:codigoMateria", autorizar("admin", "profesor"), registrarCalificacion);
router.delete("/:id", eliminarMatricula);

export default router;