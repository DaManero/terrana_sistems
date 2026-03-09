import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { autenticar } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authController.registrar);

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authController.solicitarRecupero);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authController.resetearPassword);

// POST /api/v1/auth/set-password
router.post('/set-password', authController.establecerPassword);

// POST /api/v1/auth/guest-to-account
router.post('/guest-to-account', authController.crearCuentaDesdeGuest);

// GET /api/v1/auth/me
router.get('/me', autenticar, authController.perfil);

export default router;
