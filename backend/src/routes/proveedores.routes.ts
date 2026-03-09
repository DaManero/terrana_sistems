import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/proveedores
router.get('/', autenticar, requiereRol('Admin', 'Operador'), async (_req, res, next) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(proveedores);
  } catch (error) { next(error); }
});

// GET /api/v1/proveedores/:id
router.get('/:id', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: Number(req.params.id) },
      include: { productos: { select: { id: true, nombre: true, activo: true } } },
    });
    if (!proveedor) throw new AppError('Proveedor no encontrado', 404);
    res.json(proveedor);
  } catch (error) { next(error); }
});

// POST /api/v1/proveedores
router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proveedor = await prisma.proveedor.create({ data: req.body });
    res.status(201).json(proveedor);
  } catch (error) { next(error); }
});

// PATCH /api/v1/proveedores/:id
router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proveedor = await prisma.proveedor.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(proveedor);
  } catch (error) { next(error); }
});

// DELETE /api/v1/proveedores/:id (borrado lógico)
router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.proveedor.update({
      where: { id: Number(req.params.id) },
      data: { activo: false },
    });
    res.json({ mensaje: 'Proveedor desactivado' });
  } catch (error) { next(error); }
});

export default router;
