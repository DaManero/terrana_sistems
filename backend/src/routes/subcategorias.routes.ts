import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/subcategorias?categoriaId=1
router.get('/', async (req, res, next) => {
  try {
    const where = req.query.categoriaId
      ? { categoria_id: Number(req.query.categoriaId) }
      : {};
    const subcategorias = await prisma.subcategoria.findMany({
      where,
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(subcategorias);
  } catch (error) { next(error); }
});

router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subcategoria.create({
      data: { nombre: req.body.nombre, categoria_id: Number(req.body.categoria_id) },
      include: { categoria: true },
    });
    res.status(201).json(sub);
  } catch (error) { next(error); }
});

router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subcategoria.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.nombre && { nombre: req.body.nombre }),
        ...(req.body.categoria_id && { categoria_id: Number(req.body.categoria_id) }),
      },
    });
    res.json(sub);
  } catch (error) { next(error); }
});

router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.subcategoria.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensaje: 'Subcategoría eliminada' });
  } catch (error) { next(error); }
});

export default router;
