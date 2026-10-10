import { Router } from "express";
import authRoutes from "./auth.routes";
import cursosRoutes from "./cursos.routes";
import matriculasRoutes from "./matriculas.routes";
import telemetriaRoutes from "./telemetria.routes";

const router = Router();

router.get("/salud", (_req, res) => res.status(200).json({ ok: true }));
router.get("/health", (_req, res) => res.status(200).json({
  status: "ok",
  message: "Backend del Sistema Escolar funcionando"
}));
router.use("/auth", authRoutes);
router.use("/cursos", cursosRoutes);
router.use("/matriculas", matriculasRoutes);
router.use("/telemetria", telemetriaRoutes);

export default router;