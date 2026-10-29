import { Router } from "express";
import {
  crearSolicitudSoporteDocente,
  listarMisSolicitudesSoporte,
  listarSolicitudesSoporteAdmin,
  responderSolicitudSoporteAdmin
} from "../controllers/soporte.controller";
import { autenticar, autorizar } from "../middlewares/auth.middleware";

const router = Router();
router.use(autenticar);
router.get("/mias", autorizar("profesor"), listarMisSolicitudesSoporte);
router.post("/mias", autorizar("profesor"), crearSolicitudSoporteDocente);
router.get("/admin", autorizar("admin"), listarSolicitudesSoporteAdmin);
router.patch("/admin/:id", autorizar("admin"), responderSolicitudSoporteAdmin);

export default router;
