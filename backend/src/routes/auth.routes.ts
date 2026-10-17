import { Router } from "express";
import { login, logout, refresh, registrarUsuario } from "../controllers/auth.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/register", registrarUsuario);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/usuarios", autenticar, autorizar("admin"), registrarUsuario);

export default router;
