import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { autenticar, autenticarOpcional } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';

const router = Router();

// GET /api/v1/productos — público (precio mayorista solo si corresponde)
router.get('/', autenticarOpcional, productosController.listar);

// GET /api/v1/productos/:id — público
router.get('/:id', autenticarOpcional, productosController.obtenerPorId);

// POST /api/v1/productos — Admin / Operador
router.post(
  '/',
  autenticar,
  requiereRol('Admin', 'Operador'),
  productosController.crear
);

// PATCH /api/v1/productos/:id — Admin / Operador
router.patch(
  '/:id',
  autenticar,
  requiereRol('Admin', 'Operador'),
  productosController.actualizar
);

// DELETE /api/v1/productos/:id — solo Admin (borrado lógico)
router.delete(
  '/:id',
  autenticar,
  requiereRol('Admin'),
  productosController.eliminar
);

// PUT /api/v1/productos/:id/etiquetas — Admin / Operador
router.put(
  '/:id/etiquetas',
  autenticar,
  requiereRol('Admin', 'Operador'),
  productosController.actualizarEtiquetas
);

export default router;
