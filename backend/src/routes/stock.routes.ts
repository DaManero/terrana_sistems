import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { ajustarStock } from '../services/productos.service';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/stock/movimientos?productoId=1 — Admin / Operador
router.get('/movimientos', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Number(req.query.porPagina ?? 30);
    const productoId = req.query.productoId ? Number(req.query.productoId) : undefined;

    const where = { ...(productoId && { producto_id: productoId }) };

    const [total, movimientos] = await Promise.all([
      prisma.stockMovimiento.count({ where }),
      prisma.stockMovimiento.findMany({
        where,
        include: {
          producto: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    res.json({ data: movimientos, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) });
  } catch (error) { next(error); }
});

// POST /api/v1/stock/ajuste — ajuste manual de stock (Admin / Operador)
router.post('/ajuste', autenticar, requiereRol('Admin', 'Operador'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { producto_id, cantidad, motivo } = req.body;
    const resultado = await ajustarStock(
      Number(producto_id),
      Number(cantidad),
      'ajuste_manual',
      req.usuario!.id,
      undefined,
      motivo
    );
    res.json({ mensaje: 'Ajuste registrado', ...resultado });
  } catch (error) { next(error); }
});

export default router;
