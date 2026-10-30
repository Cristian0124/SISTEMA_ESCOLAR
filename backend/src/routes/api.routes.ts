import { Router } from "express";
import authRoutes from "./auth.routes";
import cursosRoutes from "./cursos.routes";
import matriculasRoutes from "./matriculas.routes";
import creditosRoutes from "./creditos.routes";
import telemetriaRoutes from "./telemetria.routes";
import soporteRoutes from "./soporte.routes";
import documentosRoutes from "./documentos.routes";

import academicoRoutes from "./academico.routes";

const router = Router();
router.use("/academico", academicoRoutes);

router.get("/salud", (_req, res) => res.status(200).json({ ok: true }));
router.get("/health", (_req, res) => res.status(200).json({
  status: "ok",
  message: "Backend del Sistema Escolar funcionando"
}));
router.use("/auth", authRoutes);
router.use("/cursos", cursosRoutes);
router.use("/matriculas", matriculasRoutes);
router.use("/creditos", creditosRoutes);
router.use("/telemetria", telemetriaRoutes);
router.use("/soporte", soporteRoutes);
router.use("/documentos", documentosRoutes);

export default router;
