import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function invitar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authService.invitarUsuario(req.body.email, req.usuario!.id);
    res.json({ mensaje: 'Invitación enviada correctamente.' });
  } catch (error) {
    next(error);
  }
}

export async function registrar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resultado = await authService.registrar(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function solicitarRecupero(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;
    await authService.solicitarRecupero(email);
    // Siempre responder igual para no revelar si el email existe
    res.json({ mensaje: 'Si el email existe, recibirás un link para recuperar tu contraseña.' });
  } catch (error) {
    next(error);
  }
}

export async function resetearPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;
    await authService.resetearPassword(token, password);
    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    next(error);
  }
}

export async function establecerPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;
    const resultado = await authService.establecerPassword(token, password);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function crearCuentaDesdeGuest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resultado = await authService.crearCuentaDesdeGuest(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function perfil(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.usuario fue adjuntado por el middleware autenticar
    res.json({ usuario: req.usuario });
  } catch (error) {
    next(error);
  }
}
