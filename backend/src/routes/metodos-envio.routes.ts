import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar, autenticarOpcional } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/metodos-envio — público
router.get('/', autenticarOpcional, async (_req, res, next) => {
  try {
    const metodos = await prisma.metodoEnvio.findMany({
      where: { activo: true },
      orderBy: { costo: 'asc' },
    });
    res.json(metodos);
  } catch (error) { next(error); }
});

// POST /api/v1/metodos-envio — Admin
router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metodo = await prisma.metodoEnvio.create({ data: req.body });
    res.status(201).json(metodo);
  } catch (error) { next(error); }
});

// PATCH /api/v1/metodos-envio/:id — Admin
router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metodo = await prisma.metodoEnvio.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(metodo);
  } catch (error) { next(error); }
});

// DELETE /api/v1/metodos-envio/:id — Admin
router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.metodoEnvio.update({
      where: { id: Number(req.params.id) },
      data: { activo: false },
    });
    res.json({ mensaje: 'Método de envío desactivado' });
  } catch (error) { next(error); }
});

export default router;
