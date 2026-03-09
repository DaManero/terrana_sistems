import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const items = await prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
    res.json(items);
  } catch (error) { next(error); }
});

router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.marca.create({ data: { nombre: req.body.nombre } });
    res.status(201).json(item);
  } catch (error) { next(error); }
});

router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.marca.update({ where: { id: Number(req.params.id) }, data: { nombre: req.body.nombre } });
    res.json(item);
  } catch (error) { next(error); }
});

router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.marca.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensaje: 'Marca eliminada' });
  } catch (error) { next(error); }
});

export default router;
