import { Router } from "express";
import { autenticar, autorizar, type UsuarioAutenticado } from "../middlewares/auth.middleware";
import { consultarResumenMatricula } from "../repositorios/documentos.repository";
import { generarResumenPdf } from "../services/documentos.service";
import { HttpError } from "../types/http-error";

const router = Router();
router.use(autenticar, autorizar("estudiante"));
// No se acepta un ID de estudiante: siempre se usa la identidad autenticada.
router.get(["/resumen-matricula", "/resumen-matricula.pdf"], async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const usuario = res.locals.usuario as UsuarioAutenticado;
  const resumen = await consultarResumenMatricula(usuario.id);
  if (!resumen) throw new HttpError(403, "ACCESO_DENEGADO", "El estudiante no existe o no está activo");
  if (!req.path.endsWith(".pdf")) {
    res.status(200).json(resumen);
    return;
  }
  if (!resumen.cursos.length) throw new HttpError(409, "SIN_MATRICULAS", "No tienes matrículas activas en el periodo vigente");
  const pdf = await generarResumenPdf(resumen);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="resumen-matricula-${resumen.periodo}.pdf"`);
  res.status(200).send(pdf);
});

export default router;
