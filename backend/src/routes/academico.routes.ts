import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.middleware';
import * as controlador from '../controllers/academico.controller';

const router = Router();
router.get('/facultades', controlador.listarFacultades);
router.get('/carreras', controlador.listarCarreras);
router.get('/carreras/:codigo/pensum', controlador.consultarPensum);
router.get('/estudiantes/sin-carrera', autenticar, autorizar('admin'), controlador.listarEstudiantesSinCarrera);
// La asignación inicial conserva notas y matrículas; no realiza traslados.
router.patch('/estudiantes/:id/carrera', autenticar, autorizar('admin'), controlador.asignarCarreraInicial);

export default router;
