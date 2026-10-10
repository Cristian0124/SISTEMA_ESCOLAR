import { Router } from "express";
import {
  crearMatricula,
  eliminarMatricula,
  listarMisMatriculas
} from "../controllers/matriculas.controller";
import { autenticar } from "../middlewares/auth.middleware";

const router = Router();

router.use(autenticar);
router.post("/", crearMatricula);
router.get("/mias", listarMisMatriculas);
router.delete("/:id", eliminarMatricula);

export default router;