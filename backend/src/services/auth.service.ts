import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';
import {
  generarJWT,
  generarTokenAleatorio,
  calcularExpiracion,
} from '../utils/tokens';
import {
  enviarEmail,
  templateSetPassword,
  templateResetPassword,
  templatePasswordCambiada,
  templateInvitacion,
} from '../utils/email';

// ─── Invitar usuario (solo Admin) ─────────────────────────────────────────────

export async function invitarUsuario(email: string, adminId: number): Promise<void> {
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) throw new AppError('Ya existe una cuenta con ese email', 409);

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError('Admin no encontrado', 404);

  // Invalidar invitaciones previas no usadas para ese email
  await prisma.invitationToken.updateMany({
    where: { email, usado: false },
    data: { usado: true },
  });

  const token = generarTokenAleatorio();

  await prisma.invitationToken.create({
    data: {
      email,
      token,
      invitado_por: adminId,
      expira_at: calcularExpiracion(48),
    },
  });

  const link = `${process.env.ECOMMERCE_URL}/auth/register?token=${token}`;

  await enviarEmail({
    to: email,
    subject: 'Invitación para crear tu cuenta en Terrana',
    html: templateInvitacion({
      link,
      adminNombre: `${admin.nombre} ${admin.apellido}`,
    }),
  });
}

// ─── Registro (requiere token de invitación) ──────────────────────────────────

interface DatosRegistro {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  cel?: string;
  token: string;
}

export async function registrar(datos: DatosRegistro) {
  // Validar token de invitación
  const invitacion = await prisma.invitationToken.findUnique({
    where: { token: datos.token },
  });

  if (
    !invitacion ||
    invitacion.usado ||
    invitacion.expira_at < new Date() ||
    invitacion.email.toLowerCase() !== datos.email.toLowerCase()
  ) {
    throw new AppError('Invitación inválida, expirada o el email no coincide', 400);
  }

  const existente = await prisma.user.findUnique({
    where: { email: datos.email },
  });

  if (existente) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  // Buscar el rol "Cliente Minorista" — es el rol por defecto al registrarse
  const rol = await prisma.rol.findUnique({
    where: { nombre: 'Cliente Minorista' },
  });

  if (!rol) {
    throw new AppError('Error de configuración: rol base no encontrado', 500);
  }

  const passwordHash = await bcrypt.hash(datos.password, 10);

  const usuario = await prisma.user.create({
    data: {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      password: passwordHash,
      cel: datos.cel,
      rol_id: rol.id,
      activo: true,
      aprobado: false,
    },
    include: { rol: true },
  });

  // Marcar invitación como usada
  await prisma.invitationToken.update({
    where: { id: invitacion.id },
    data: { usado: true },
  });

  const token = generarJWT({
    id: usuario.id,
    email: usuario.email ?? '',
    rol: usuario.rol.nombre,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
      aprobado: usuario.aprobado,
    },
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const usuario = await prisma.user.findUnique({
    where: { email },
    include: { rol: true },
  });

  if (!usuario) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  if (!usuario.activo) {
    throw new AppError('Usuario desactivado. Contactese con el administrador.', 403);
  }

  if (!usuario.password) {
    throw new AppError(
      'Esta cuenta no tiene contraseña configurada. Revisá tu email para activarla.',
      401
    );
  }

  const passwordOk = await bcrypt.compare(password, usuario.password);

  if (!passwordOk) {
    throw new AppError('Credenciales incorrectas', 401);
  }

  const token = generarJWT({
    id: usuario.id,
    email: usuario.email ?? '',
    rol: usuario.rol.nombre,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
      aprobado: usuario.aprobado,
    },
  };
}

// ─── Solicitar recupero de contraseña ─────────────────────────────────────────

export async function solicitarRecupero(email: string): Promise<void> {
  const usuario = await prisma.user.findUnique({ where: { email } });

  // Siempre responder igual para no revelar qué emails están registrados
  if (!usuario || !usuario.activo) return;

  const token = generarTokenAleatorio();

  await prisma.passwordResetToken.create({
    data: {
      usuario_id: usuario.id,
      token,
      tipo: 'reset_password',
      expira_at: calcularExpiracion(1), // 1 hora
    },
  });

  const link = `${process.env.ECOMMERCE_URL}/auth/reset-password?token=${token}`;

  await enviarEmail({
    to: usuario.email ?? '',
    subject: 'Recuperar contraseña — Terrana',
    html: templateResetPassword({
      nombre: usuario.nombre,
      link,
    }),
  });
}

// ─── Resetear contraseña ──────────────────────────────────────────────────────

export async function resetearPassword(
  token: string,
  nuevaPassword: string
): Promise<void> {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: true },
  });

  if (
    !registro ||
    registro.usado ||
    registro.expira_at < new Date() ||
    registro.tipo !== 'reset_password'
  ) {
    throw new AppError('Token inválido o expirado', 400);
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: registro.usuario_id },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: registro.id },
      data: { usado: true },
    }),
  ]);

  await enviarEmail({
    to: registro.usuario.email ?? '',
    subject: 'Tu contraseña fue cambiada — Terrana',
    html: templatePasswordCambiada({ nombre: registro.usuario.nombre }),
  });
}

// ─── Establecer contraseña (post-registro guest) ──────────────────────────────

export async function establecerPassword(
  token: string,
  nuevaPassword: string
) {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { usuario: { include: { rol: true } } },
  });

  if (
    !registro ||
    registro.usado ||
    registro.expira_at < new Date() ||
    registro.tipo !== 'set_password'
  ) {
    throw new AppError('Token inválido o expirado', 400);
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: registro.usuario_id },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: registro.id },
      data: { usado: true },
    }),
  ]);

  const jwt = generarJWT({
    id: registro.usuario.id,
    email: registro.usuario.email ?? '',
    rol: registro.usuario.rol.nombre,
  });

  return {
    token: jwt,
    usuario: {
      id: registro.usuario.id,
      nombre: registro.usuario.nombre,
      email: registro.usuario.email,
      rol: registro.usuario.rol.nombre,
    },
  };
}

// ─── Crear cuenta desde guest (post-compra) ───────────────────────────────────

interface DatosGuestACuenta {
  nombre: string;
  apellido?: string;
  email: string;
  cel?: string;
  ventaId: number;
}

export async function crearCuentaDesdeGuest(datos: DatosGuestACuenta) {
  const existente = await prisma.user.findUnique({
    where: { email: datos.email },
  });

  if (existente) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const rol = await prisma.rol.findUnique({
    where: { nombre: 'Cliente Minorista' },
  });

  if (!rol) throw new AppError('Error de configuración', 500);

  // Crear usuario SIN contraseña — se establece desde el link del email
  const usuario = await prisma.user.create({
    data: {
      nombre: datos.nombre,
      apellido: datos.apellido ?? '',
      email: datos.email,
      cel: datos.cel,
      rol_id: rol.id,
      activo: true,
      aprobado: false,
    },
    include: { rol: true },
  });

  // Vincular la venta guest al nuevo usuario
  await prisma.venta.update({
    where: { id: datos.ventaId },
    data: { cliente_id: usuario.id },
  });

  // Generar token de set-password (24 hs)
  const token = generarTokenAleatorio();

  await prisma.passwordResetToken.create({
    data: {
      usuario_id: usuario.id,
      token,
      tipo: 'set_password',
      expira_at: calcularExpiracion(24),
    },
  });

  const link = `${process.env.ECOMMERCE_URL}/auth/set-password?token=${token}`;

  await enviarEmail({
    to: usuario.email ?? '',
    subject: 'Activá tu cuenta en Terrana',
    html: templateSetPassword({ nombre: usuario.nombre, link }),
  });

  return { mensaje: 'Cuenta creada. Se envió un email para establecer la contraseña.' };
}
