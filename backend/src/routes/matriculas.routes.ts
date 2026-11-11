import { Router } from "express";
import {
  eliminarMatricula,
  listarMisMatriculas,
  listarTodasMatriculasAdministrador,
  obtenerAvancePensum,
  listarMisCalificaciones,
  registrarCalificacion,
  listarCursosDocente,
  listarEstudiantesDeCursoDocente
} from "../controllers/matriculas.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

import { solicitarMatricula, misSolicitudes, miSolicitud } from "../controllers/masiva.controller";
import { limitarSolicitudes } from "../middlewares/rate-limit.middleware";
const router = Router();

router.use(autenticar);
router.post("/", autorizar("estudiante"), limitarSolicitudes("matricula", 60, 60, true), solicitarMatricula);
router.get("/solicitudes", autorizar("estudiante"), misSolicitudes);
router.get("/solicitudes/:id", autorizar("estudiante"), miSolicitud);
router.get("/mias", listarMisMatriculas);
router.get("/admin/todas", autorizar("admin"), listarTodasMatriculasAdministrador);
router.get("/avance", obtenerAvancePensum);
router.get("/calificaciones/mias", listarMisCalificaciones);
router.get("/docente/cursos", autorizar("profesor"), listarCursosDocente);
router.get("/docente/cursos/:cursoId/estudiantes", autorizar("profesor"), listarEstudiantesDeCursoDocente);
router.put("/calificaciones/:usuarioId/:codigoMateria", autorizar("admin", "profesor"), registrarCalificacion);
router.delete("/:id", eliminarMatricula);

export default router;
