import { Router } from "express";
import { obtenerMisCreditos } from "../controllers/creditos.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";
const router = Router();
router.get("/mios",autenticar,autorizar("estudiante"),obtenerMisCreditos);
export default router;
