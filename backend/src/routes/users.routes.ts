import { Router } from 'express';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol, esOwnerOAdmin } from '../middlewares/roles.middleware';
import * as usersController from '../controllers/users.controller';
import { prisma } from '../prisma/client';

const router = Router();

// ─── Roles (para selectores en el frontend) ───────────────────────────────────

// GET /api/v1/users/roles
router.get('/roles', autenticar, requiereRol('Admin', 'Operador'), async (_req, res, next) => {
  try {
    const roles = await prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
    res.json(roles);
  } catch (error) { next(error); }
});

// ─── Perfil propio ────────────────────────────────────────────────────────────

// GET /api/v1/users/me
router.get('/me', autenticar, usersController.miPerfil);

// ─── Solicitudes mayorista (rutas específicas antes de /:id) ─────────────────

// POST /api/v1/users/mayorista/solicitar
router.post('/mayorista/solicitar', autenticar, usersController.solicitarAltaMayorista);

// GET /api/v1/users/mayorista/solicitudes
router.get('/mayorista/solicitudes', autenticar, requiereRol('Admin', 'Operador'), usersController.listarSolicitudesMayorista);

// PATCH /api/v1/users/mayorista/solicitudes/:id
router.patch('/mayorista/solicitudes/:id', autenticar, requiereRol('Admin', 'Operador'), usersController.resolverSolicitud);

// ─── CRUD de usuarios ─────────────────────────────────────────────────────────

// GET /api/v1/users
router.get('/', autenticar, requiereRol('Admin', 'Operador'), usersController.listar);

// GET /api/v1/users/:id
router.get('/:id', autenticar, esOwnerOAdmin, usersController.obtenerPorId);

// PATCH /api/v1/users/:id
router.patch('/:id', autenticar, esOwnerOAdmin, usersController.actualizar);

// PATCH /api/v1/users/:id/password
router.patch('/:id/password', autenticar, esOwnerOAdmin, usersController.cambiarPassword);

// PATCH /api/v1/users/:id/aprobacion — solo Admin
router.patch('/:id/aprobacion', autenticar, requiereRol('Admin'), usersController.cambiarAprobacion);

// PATCH /api/v1/users/:id/rol — solo Admin
router.patch('/:id/rol', autenticar, requiereRol('Admin'), usersController.cambiarRol);

// PATCH /api/v1/users/:id/estado — solo Admin
router.patch('/:id/estado', autenticar, requiereRol('Admin'), usersController.cambiarEstado);

// DELETE /api/v1/users/:id — solo Admin
router.delete('/:id', autenticar, requiereRol('Admin'), usersController.eliminar);

export default router;
