import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.middleware';
import { consultarDatos, guardarDatos, consultarHoja, guardarHoja } from '../controllers/perfil.controller';

const router = Router();
router.use(autenticar, autorizar('estudiante'));
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.get('/datos', consultarDatos);
router.put('/datos', guardarDatos);
router.get('/hoja-de-vida', consultarHoja);
router.put('/hoja-de-vida', guardarHoja);

export default router;
