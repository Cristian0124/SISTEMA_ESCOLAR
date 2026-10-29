import { Router } from "express";
import { asignarDocente, listarCursos } from "../controllers/cursos.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.use(autenticar);
router.get("/", listarCursos);
router.put("/:id/docente", autorizar("admin"), asignarDocente);

export default router;
