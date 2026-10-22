import { Router } from "express";
import { login, listarProfesores, logout, refresh, registrarEstudiante, registrarUsuario } from "../controllers/auth.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/register", registrarEstudiante);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/usuarios", autenticar, autorizar("admin"), registrarUsuario);
router.get("/profesores", autenticar, autorizar("admin"), listarProfesores);

export default router;
