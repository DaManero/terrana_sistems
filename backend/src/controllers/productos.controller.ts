import { Request, Response, NextFunction } from 'express';
import * as productosService from '../services/productos.service';
import { FiltrosProducto } from '../types';

function esMayoristaOAdmin(req: Request): boolean {
  if (!req.usuario) return false;
  const rol = req.usuario.rol;
  if (rol === 'Admin' || rol === 'Operador') return true;
  if (rol === 'Cliente Mayorista' && req.usuario.aprobado) return true;
  return false;
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filtros: FiltrosProducto = {
      categoriaId: req.query.categoriaId ? Number(req.query.categoriaId) : undefined,
      subcategoriaId: req.query.subcategoriaId ? Number(req.query.subcategoriaId) : undefined,
      marcaId: req.query.marcaId ? Number(req.query.marcaId) : undefined,
      presentacionId: req.query.presentacionId ? Number(req.query.presentacionId) : undefined,
      origenId: req.query.origenId ? Number(req.query.origenId) : undefined,
      busqueda: req.query.busqueda as string | undefined,
      soloConStock: req.query.soloConStock === 'true',
      soloActivos: req.query.soloActivos !== 'false',
      pagina: req.query.pagina ? Number(req.query.pagina) : 1,
      porPagina: req.query.porPagina ? Number(req.query.porPagina) : 20,
      ordenar: (req.query.ordenar as FiltrosProducto['ordenar']) ?? 'nombre_asc',
    };

    const resultado = await productosService.listar(filtros, esMayoristaOAdmin(req));
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await productosService.obtenerPorId(
      Number(req.params.id),
      esMayoristaOAdmin(req)
    );
    res.json(producto);
  } catch (error) {
    next(error);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await productosService.crear(req.body);
    res.status(201).json(producto);
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await productosService.actualizar(Number(req.params.id), req.body);
    res.json(producto);
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productosService.eliminar(Number(req.params.id));
    res.json({ mensaje: 'Producto desactivado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function actualizarEtiquetas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { etiquetaIds } = req.body as { etiquetaIds: number[] };
    await productosService.sincronizarEtiquetas(Number(req.params.id), etiquetaIds);
    res.json({ mensaje: 'Etiquetas actualizadas' });
  } catch (error) {
    next(error);
  }
}
