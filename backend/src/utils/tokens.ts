import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Genera un token aleatorio seguro para uso en links de email
 * (set-password, reset-password).
 */
export function generarTokenAleatorio(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calcula la fecha de vencimiento a partir de ahora.
 * @param horas - Cantidad de horas hasta el vencimiento
 */
export function calcularExpiracion(horas: number): Date {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

/**
 * Genera un JWT firmado con los datos del usuario.
 */
export function generarJWT(payload: {
  id: number;
  email: string;
  rol: string;
}): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

/**
 * Genera el número de pedido legible: TRR-XXXXX
 * @param id - ID de la venta en la DB
 */
export function generarNumeroPedido(id: number): string {
  return `TRR-${String(id).padStart(5, '0')}`;
}
