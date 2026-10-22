import { Router } from "express";
import { asignarDocente, listarCursos } from "../controllers/cursos.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", listarCursos);
router.put("/:id/docente", autenticar, autorizar("admin"), asignarDocente);

export default router;
