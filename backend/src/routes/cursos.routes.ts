import { Router } from "express";
import { listarCursos } from "../controllers/cursos.controller";
import { autenticar } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", autenticar, listarCursos);

export default router;