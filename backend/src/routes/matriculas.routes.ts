import { Router } from "express";
import {
  crearMatricula,
  eliminarMatricula,
  listarMisMatriculas,
  obtenerAvancePensum,
  registrarCalificacion
} from "../controllers/matriculas.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.use(autenticar);
router.post("/", crearMatricula);
router.get("/mias", listarMisMatriculas);
router.get("/avance", obtenerAvancePensum);
router.put("/calificaciones/:usuarioId/:codigoMateria", autorizar("admin", "profesor"), registrarCalificacion);
router.delete("/:id", eliminarMatricula);

export default router;