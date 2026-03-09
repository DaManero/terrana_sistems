import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * errorHandler — middleware global de manejo de errores.
 * Debe registrarse al final de todos los middlewares en app.ts.
 * Normaliza los errores de Prisma para no exponer detalles internos.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === 'development';

  // Error controlado de la aplicación
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      mensaje: err.message,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // Errores de Prisma — traducir a respuestas HTTP limpias
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        res.status(409).json({
          mensaje: 'Ya existe un registro con esos datos',
          campo: err.meta?.target,
        });
        return;

      case 'P2025':
        // Record not found
        res.status(404).json({ mensaje: 'Registro no encontrado' });
        return;

      case 'P2003':
        // Foreign key constraint violation
        res.status(400).json({
          mensaje: 'Referencia a un registro inexistente',
        });
        return;

      default:
        console.error('Prisma error:', err.code, err.message);
        res.status(500).json({ mensaje: 'Error de base de datos' });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ mensaje: 'Datos inválidos en la consulta' });
    return;
  }

  // Error genérico no controlado
  console.error('Error no controlado:', err);
  res.status(500).json({
    mensaje: 'Error interno del servidor',
    ...(isDev && { detalle: err.message, stack: err.stack }),
  });
};
