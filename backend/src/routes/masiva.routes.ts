import { Router } from "express";
import { autenticar, autorizar } from "../middlewares/auth.middleware";
import { verPeriodo, editarPeriodo, verMetricas } from "../controllers/masiva.controller";

import { estadoSimulacion, ejecutarSimulacion } from "../controllers/simulacion.controller";
const router = Router();
router.use(autenticar);
router.get("/simulacion",autorizar("admin"),estadoSimulacion);
router.post("/simulacion",autorizar("admin"),ejecutarSimulacion);
router.get("/periodo",verPeriodo);
router.put("/periodo",autorizar("admin"),editarPeriodo);
router.get("/monitoreo",autorizar("admin"),verMetricas);
export default router;
