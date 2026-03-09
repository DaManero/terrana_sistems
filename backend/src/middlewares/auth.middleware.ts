import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

export interface JwtPayload {
  id: number;
  email: string;
  rol: string;
}

// Extender el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        email: string;
        rol: string;
        aprobado: boolean;
      };
    }
  }
}

/**
 * autenticar — valida el JWT del header Authorization y adjunta
 * el usuario al request. Corta con 401 si no hay token o es inválido.
 */
export const autenticar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    // Verificar que el usuario sigue activo en la DB
    const usuario = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { rol: true },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario inactivo o inexistente' });
      return;
    }

    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      aprobado: usuario.aprobado,
    };

    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

/**
 * autenticarOpcional — igual que autenticar pero NO corta si no hay token.
 * Útil para rutas públicas donde el contexto del usuario cambia la respuesta
 * (ej: precios según tipo de cliente).
 */
export const autenticarOpcional = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const usuario = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { rol: true },
    });

    if (usuario && usuario.activo) {
      req.usuario = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        aprobado: usuario.aprobado,
      };
    }
  } catch {
    // Token inválido — continuamos sin usuario
  }

  next();
};
