import { Router } from "express";
import { listarCursos } from "../controllers/cursos.controller";

const router = Router();

router.get("/", listarCursos);

export default router;