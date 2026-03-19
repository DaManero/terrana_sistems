import { Resend } from 'resend';
// nodemailer v8 es ESM-only; usamos require para compatibilidad con CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as typeof import('nodemailer');

const isProduction = process.env.NODE_ENV === 'production';

// ─── Resend (producción) ──────────────────────────────────────────────────────
const resend = isProduction ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Nodemailer (desarrollo) ──────────────────────────────────────────────────
const port = Number(process.env.SMTP_PORT ?? 587);
const transporter = !isProduction ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
}) : null;

// Verifica la conexión al arrancar — logguea advertencia si falla, no rompe el server
export async function verificarConexionSMTP(): Promise<void> {
  if (isProduction) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY no configurada — los emails no se enviarán.');
    } else {
      console.log('[Email] Resend configurado correctamente.');
    }
    return;
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Email] SMTP no configurado — los emails no se enviarán.');
    return;
  }
  try {
    await transporter!.verify();
    console.log('[Email] Conexión SMTP verificada correctamente.');
  } catch (err) {
    console.error('[Email] Error al verificar conexión SMTP:', err);
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function enviarEmail(options: EmailOptions): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'Terrana <no-reply@terranagourmet.com.ar>';
  if (isProduction && resend) {
    await resend.emails.send({ from, ...options });
  } else if (transporter) {
    await transporter.sendMail({ from, ...options });
  } else {
    console.warn('[Email] Sin proveedor configurado — email no enviado:', options.subject);
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function templateConfirmacionPedido(params: {
  nombre: string;
  numeroPedido: string;
  total: string;
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1a13;">
      <h1 style="color: #594d0e;">¡Pedido confirmado!</h1>
      <p>Hola <strong>${params.nombre}</strong>,</p>
      <p>Tu pedido <strong>${params.numeroPedido}</strong> fue confirmado correctamente.</p>
      <p>Total: <strong>$${params.total}</strong></p>
      <p>Te avisaremos cuando sea despachado.</p>
      <p style="color: #4a4535;">El equipo de Terrana</p>
    </div>
  `;
}

export function templateSetPassword(params: {
  nombre: string;
  link: string;
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1a13;">
      <h1 style="color: #594d0e;">Activá tu cuenta</h1>
      <p>Hola <strong>${params.nombre}</strong>,</p>
      <p>Tu pedido fue procesado. Hacé clic en el botón para crear una contraseña y acceder a tu cuenta:</p>
      <p>
        <a href="${params.link}"
           style="background: #594d0e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Crear contraseña
        </a>
      </p>
      <p style="color: #9c9485; font-size: 14px;">Este link vence en 24 horas.</p>
      <p style="color: #4a4535;">El equipo de Terrana</p>
    </div>
  `;
}

export function templateResetPassword(params: {
  nombre: string;
  link: string;
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1a13;">
      <h1 style="color: #594d0e;">Recuperar contraseña</h1>
      <p>Hola <strong>${params.nombre}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón:</p>
      <p>
        <a href="${params.link}"
           style="background: #594d0e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color: #9c9485; font-size: 14px;">Este link vence en 1 hora.</p>
      <p style="color: #9c9485; font-size: 14px;">Si no solicitaste esto, ignorá este email.</p>
      <p style="color: #4a4535;">El equipo de Terrana</p>
    </div>
  `;
}

export function templateInvitacion(params: {
  link: string;
  adminNombre: string;
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1a13;">
      <h1 style="color: #594d0e;">Fuiste invitado a Terrana</h1>
      <p><strong>${params.adminNombre}</strong> te invitó a crear una cuenta en la plataforma de Terrana.</p>
      <p>Hacé clic en el botón para completar tu registro:</p>
      <p>
        <a href="${params.link}"
           style="background: #594d0e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Crear mi cuenta
        </a>
      </p>
      <p style="color: #9c9485; font-size: 14px;">Este link vence en 48 horas.</p>
      <p style="color: #9c9485; font-size: 14px;">Si no esperabas este email, podés ignorarlo.</p>
      <p style="color: #4a4535;">El equipo de Terrana</p>
    </div>
  `;
}

export function templatePasswordCambiada(params: { nombre: string }): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1a13;">
      <h1 style="color: #594d0e;">Contraseña actualizada</h1>
      <p>Hola <strong>${params.nombre}</strong>,</p>
      <p>Tu contraseña fue cambiada exitosamente.</p>
      <p style="color: #9c9485; font-size: 14px;">Si no realizaste este cambio, contactanos de inmediato.</p>
      <p style="color: #4a4535;">El equipo de Terrana</p>
    </div>
  `;
}
