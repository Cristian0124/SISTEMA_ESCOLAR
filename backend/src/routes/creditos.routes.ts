import { Router } from "express";
import {
  listarSolicitudes,
  obtenerMisCreditos,
  revisarSolicitud,
  solicitarCreditosAdicionales
} from "../controllers/creditos.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();
router.use(autenticar);
router.get("/mios", autorizar("estudiante"), obtenerMisCreditos);
router.post("/solicitudes", autorizar("estudiante"), solicitarCreditosAdicionales);
router.get("/solicitudes", autorizar("admin"), listarSolicitudes);
router.patch("/solicitudes/:id", autorizar("admin"), revisarSolicitud);

export default router;
