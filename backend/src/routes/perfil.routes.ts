import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.middleware';
import { consultarDatos, guardarDatos } from '../controllers/perfil.controller';

const router = Router();
router.use(autenticar, autorizar('estudiante'));
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.get('/datos', consultarDatos);
router.put('/datos', guardarDatos);

export default router;
