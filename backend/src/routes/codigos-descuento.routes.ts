import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar, autenticarOpcional } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// GET /api/v1/codigos-descuento — Admin: listado completo
router.get('/', autenticar, requiereRol('Admin'), async (_req, res, next) => {
  try {
    const codigos = await prisma.codigoDescuento.findMany({ orderBy: { created_at: 'desc' } });
    res.json(codigos);
  } catch (error) { next(error); }
});

// POST /api/v1/codigos-descuento/validar — validar un código antes del checkout
router.post('/validar', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codigo, subtotal } = req.body;

    const descuento = await prisma.codigoDescuento.findUnique({ where: { codigo } });

    if (!descuento || !descuento.activo) {
      throw new AppError('Código de descuento inválido', 404);
    }

    const ahora = new Date();
    if (descuento.valido_desde && descuento.valido_desde > ahora) {
      throw new AppError('El código aún no está vigente', 400);
    }
    if (descuento.valido_hasta && descuento.valido_hasta < ahora) {
      throw new AppError('El código está vencido', 400);
    }
    if (descuento.usos_maximos !== null && descuento.usos_actuales >= descuento.usos_maximos) {
      throw new AppError('El código alcanzó su límite de usos', 400);
    }
    if (descuento.minimo_compra && Number(subtotal) < Number(descuento.minimo_compra)) {
      throw new AppError(`Compra mínima requerida: $${descuento.minimo_compra}`, 400);
    }

    const montoDescuento = descuento.tipo === 'porcentaje'
      ? (Number(subtotal) * Number(descuento.valor)) / 100
      : Number(descuento.valor);

    res.json({
      valido: true,
      id: descuento.id,
      codigo: descuento.codigo,
      tipo: descuento.tipo,
      valor: descuento.valor,
      monto_descuento: montoDescuento.toFixed(2),
    });
  } catch (error) { next(error); }
});

// POST /api/v1/codigos-descuento — Admin
router.post('/', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codigo = await prisma.codigoDescuento.create({ data: req.body });
    res.status(201).json(codigo);
  } catch (error) { next(error); }
});

// PATCH /api/v1/codigos-descuento/:id — Admin
router.patch('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codigo = await prisma.codigoDescuento.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(codigo);
  } catch (error) { next(error); }
});

// DELETE /api/v1/codigos-descuento/:id — Admin (desactiva)
router.delete('/:id', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.codigoDescuento.update({
      where: { id: Number(req.params.id) },
      data: { activo: false },
    });
    res.json({ mensaje: 'Código desactivado' });
  } catch (error) { next(error); }
});

export default router;
