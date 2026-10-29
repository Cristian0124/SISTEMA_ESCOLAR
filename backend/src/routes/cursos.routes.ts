import { Router } from "express";
import { asignarDocente, crearCurso, listarCursos } from "../controllers/cursos.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.use(autenticar);
router.get("/", listarCursos);
router.post("/", autorizar("admin"), crearCurso);
router.put("/:id/docente", autorizar("admin"), asignarDocente);

export default router;
