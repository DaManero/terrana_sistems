import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';

// ─── Listar usuarios (Admin / Operador) ───────────────────────────────────────

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resultado = await usersService.listar({
      busqueda: req.query.busqueda as string | undefined,
      rolId: req.query.rolId ? Number(req.query.rolId) : undefined,
      tipoCliente: req.query.tipoCliente as 'mayorista' | 'minorista' | undefined,
      pagina: req.query.pagina ? Number(req.query.pagina) : undefined,
      porPagina: req.query.porPagina ? Number(req.query.porPagina) : undefined,
    });
    res.json(resultado);
  } catch (error) { next(error); }
}

// ─── Obtener usuario por ID ───────────────────────────────────────────────────

export async function obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usersService.obtenerPorId(Number(req.params.id));
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Mi perfil (usuario autenticado) ─────────────────────────────────────────

export async function miPerfil(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usersService.obtenerPorId(req.usuario!.id);
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Actualizar datos del perfil ──────────────────────────────────────────────

export async function actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nombre, apellido, cel } = req.body;
    const usuario = await usersService.actualizar(Number(req.params.id), { nombre, apellido, cel });
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

export async function cambiarPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { passwordActual, passwordNueva } = req.body;
    await usersService.cambiarPassword(Number(req.params.id), passwordActual, passwordNueva);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) { next(error); }
}
// ─── Eliminar usuario (Admin) ────────────────────────────────────────────────

export async function eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.eliminar(Number(req.params.id), req.usuario!.id);
    res.json({ mensaje: 'Usuario eliminado correctamente.' });
  } catch (error) { next(error); }
}
// ─── Cambiar rol (Admin) ────────────────────────────────────────────────────

export async function cambiarRol(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usersService.cambiarRol(Number(req.params.id), Number(req.body.rolId));
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Aprobar / desaprobar (Admin) ─────────────────────────────────────────────

export async function cambiarAprobacion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usersService.cambiarAprobacion(Number(req.params.id), req.body.aprobado);
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Activar / desactivar cuenta (Admin) ─────────────────────────────────────

export async function cambiarEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usersService.cambiarEstado(Number(req.params.id), req.body.activo);
    res.json(usuario);
  } catch (error) { next(error); }
}

// ─── Solicitar alta mayorista ─────────────────────────────────────────────────

export async function solicitarAltaMayorista(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const solicitud = await usersService.solicitarAltaMayorista(
      req.usuario!.id,
      req.body.mensaje_cliente,
    );
    res.status(201).json(solicitud);
  } catch (error) { next(error); }
}

// ─── Listar solicitudes mayorista (Admin / Operador) ─────────────────────────

export async function listarSolicitudesMayorista(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const solicitudes = await usersService.listarSolicitudesMayorista(
      req.query.estado as string | undefined,
    );
    res.json(solicitudes);
  } catch (error) { next(error); }
}

// ─── Aprobar / rechazar solicitud (Admin / Operador) ─────────────────────────

export async function resolverSolicitud(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accion, mensaje_admin } = req.body as {
      accion: 'aprobar' | 'rechazar';
      mensaje_admin?: string;
    };

    await usersService.resolverSolicitud(
      Number(req.params.id),
      req.usuario!.id,
      accion,
      mensaje_admin,
    );

    res.json({ mensaje: `Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente` });
  } catch (error) { next(error); }
}
