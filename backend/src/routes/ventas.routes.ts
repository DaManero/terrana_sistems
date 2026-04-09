import { Router } from 'express';
import { autenticar, autenticarOpcional } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import * as ventasService from '../services/ventas.service';
import { FiltrosVenta } from '../types';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// POST /api/v1/ventas — crear pedido (guest o autenticado)
router.post('/', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datos = {
      ...req.body,
      cliente_id: req.body.cliente_id ?? req.usuario?.id,
    };
    const venta = await ventasService.crear(datos);
    res.status(201).json(venta);
  } catch (error) { next(error); }
});

// GET /api/v1/ventas — Admin/Operador: todas; Cliente: las propias
router.get('/', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const esAdmin = ['Admin', 'Operador'].includes(req.usuario!.rol);
    const filtros: FiltrosVenta = {
      estado: req.query.estado as FiltrosVenta['estado'],
      pagoEstado: req.query.pagoEstado as FiltrosVenta['pagoEstado'],
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      canal: req.query.canal as FiltrosVenta['canal'],
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
      pagina: req.query.pagina ? Number(req.query.pagina) : 1,
      porPagina: req.query.porPagina ? Number(req.query.porPagina) : 20,
    };
    const resultado = await ventasService.listar(filtros, req.usuario!.id, esAdmin);
    res.json(resultado);
  } catch (error) { next(error); }
});

// GET /api/v1/ventas/:id — Admin/Operador o dueño del pedido
router.get('/:id', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venta = await ventasService.obtenerPorId(Number(req.params.id));
    const esAdmin = ['Admin', 'Operador'].includes(req.usuario!.rol);
    const esOwner = venta.cliente_id === req.usuario!.id;

    if (!esAdmin && !esOwner) throw new AppError('Sin acceso a este pedido', 403);
    res.json(venta);
  } catch (error) { next(error); }
});

// PATCH /api/v1/ventas/:id/estado — Admin / Operador
router.patch('/:id/estado', autenticar, requiereRol('Admin', 'Operador'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venta = await ventasService.actualizarEstado(Number(req.params.id), req.body.estado, req.usuario?.id);
    res.json(venta);
  } catch (error) { next(error); }
});

// PUT /api/v1/ventas/:id — Admin / Operador: editar items, estados, metodo_pago, notas
router.put('/:id', autenticar, requiereRol('Admin', 'Operador'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venta = await ventasService.editarVenta(Number(req.params.id), req.body, req.usuario?.id);
    res.json(venta);
  } catch (error) { next(error); }
});

export default router;
