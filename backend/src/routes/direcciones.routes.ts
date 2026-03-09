import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/direcciones — las propias del usuario autenticado
router.get('/', autenticar, async (req, res, next) => {
  try {
    const direcciones = await prisma.direccion.findMany({
      where: { usuario_id: req.usuario!.id },
      orderBy: [{ predeterminada: 'desc' }, { created_at: 'desc' }],
    });
    res.json(direcciones);
  } catch (error) { next(error); }
});

// POST /api/v1/direcciones
router.post('/', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alias, calle, piso_depto, localidad, provincia, codigo_postal, pais, telefono, predeterminada } = req.body;

    // Si se marca como predeterminada, quitar ese estado a las anteriores
    if (predeterminada) {
      await prisma.direccion.updateMany({
        where: { usuario_id: req.usuario!.id },
        data: { predeterminada: false },
      });
    }

    const direccion = await prisma.direccion.create({
      data: {
        usuario_id: req.usuario!.id,
        alias,
        calle,
        piso_depto,
        localidad,
        provincia,
        codigo_postal,
        pais: pais ?? 'Argentina',
        telefono,
        predeterminada: predeterminada ?? false,
      },
    });
    res.status(201).json(direccion);
  } catch (error) { next(error); }
});

// PATCH /api/v1/direcciones/:id
router.patch('/:id', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const direccion = await prisma.direccion.findUnique({ where: { id: Number(req.params.id) } });
    if (!direccion) throw new AppError('Dirección no encontrada', 404);
    if (direccion.usuario_id !== req.usuario!.id) throw new AppError('Sin acceso', 403);

    if (req.body.predeterminada) {
      await prisma.direccion.updateMany({
        where: { usuario_id: req.usuario!.id },
        data: { predeterminada: false },
      });
    }

    const actualizada = await prisma.direccion.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(actualizada);
  } catch (error) { next(error); }
});

// DELETE /api/v1/direcciones/:id
router.delete('/:id', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const direccion = await prisma.direccion.findUnique({ where: { id: Number(req.params.id) } });
    if (!direccion) throw new AppError('Dirección no encontrada', 404);
    if (direccion.usuario_id !== req.usuario!.id) throw new AppError('Sin acceso', 403);

    await prisma.direccion.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensaje: 'Dirección eliminada' });
  } catch (error) { next(error); }
});

export default router;
