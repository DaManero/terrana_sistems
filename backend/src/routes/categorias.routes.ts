import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/categorias
router.get('/', async (_req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({
      include: { subcategorias: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(categorias);
  } catch (error) { next(error); }
});

// GET /api/v1/categorias/:id
router.get('/:id', async (req, res, next) => {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id: Number(req.params.id) },
      include: { subcategorias: true },
    });
    if (!categoria) throw new AppError('Categoría no encontrada', 404);
    res.json(categoria);
  } catch (error) { next(error); }
});

// POST /api/v1/categorias
router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await prisma.categoria.create({ data: { nombre: req.body.nombre } });
    res.status(201).json(categoria);
  } catch (error) { next(error); }
});

// PATCH /api/v1/categorias/:id
router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoria = await prisma.categoria.update({
      where: { id: Number(req.params.id) },
      data: { nombre: req.body.nombre },
    });
    res.json(categoria);
  } catch (error) { next(error); }
});

// DELETE /api/v1/categorias/:id
router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.categoria.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) { next(error); }
});

export default router;
