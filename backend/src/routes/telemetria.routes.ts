import { Router } from "express";
import { consultarTelemetria } from "../controllers/telemetria.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", autenticar, autorizar("admin"), consultarTelemetria);

export default router;