import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/etiquetas — público
router.get('/', async (_req, res, next) => {
  try {
    const etiquetas = await prisma.etiqueta.findMany({ orderBy: { nombre: 'asc' } });
    res.json(etiquetas);
  } catch (error) { next(error); }
});

// POST /api/v1/etiquetas
router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etiqueta = await prisma.etiqueta.create({
      data: {
        nombre: req.body.nombre,
        slug: req.body.slug,
        color: req.body.color,
      },
    });
    res.status(201).json(etiqueta);
  } catch (error) { next(error); }
});

// PATCH /api/v1/etiquetas/:id
router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etiqueta = await prisma.etiqueta.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.nombre && { nombre: req.body.nombre }),
        ...(req.body.slug && { slug: req.body.slug }),
        ...(req.body.color && { color: req.body.color }),
      },
    });
    res.json(etiqueta);
  } catch (error) { next(error); }
});

// DELETE /api/v1/etiquetas/:id
router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.etiqueta.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensaje: 'Etiqueta eliminada' });
  } catch (error) { next(error); }
});

export default router;
