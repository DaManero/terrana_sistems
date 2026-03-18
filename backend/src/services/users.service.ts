import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FiltrosUsuarios {
  busqueda?: string;
  rolId?: number;
  pagina?: number;
  porPagina?: number;
}

export interface DatosActualizarUsuario {
  nombre?: string;
  apellido?: string;
  cel?: string;
}

// Elimina el campo password de un objeto usuario antes de devolverlo al cliente
function sanitizar<T extends { password?: string | null }>(usuario: T): Omit<T, 'password'> {
  const { password: _omit, ...resto } = usuario;
  return resto as Omit<T, 'password'>;
}

// ─── Listar usuarios (Admin / Operador) ───────────────────────────────────────

export async function listar(filtros: FiltrosUsuarios) {
  const pagina = filtros.pagina ?? 1;
  const porPagina = filtros.porPagina ?? 20;

  const where = {
    ...(filtros.busqueda && {
      OR: [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' as const } },
        { apellido: { contains: filtros.busqueda, mode: 'insensitive' as const } },
        { email: { contains: filtros.busqueda, mode: 'insensitive' as const } },
      ],
    }),
    ...(filtros.rolId && { rol_id: filtros.rolId }),
  };

  const [total, usuarios] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { rol: true },
      orderBy: { created_at: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);

  return {
    data: usuarios.map(sanitizar),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}

// ─── Obtener usuario por ID ───────────────────────────────────────────────────

export async function obtenerPorId(id: number) {
  const usuario = await prisma.user.findUnique({
    where: { id },
    include: { rol: true, direcciones: true },
  });

  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  return sanitizar(usuario);
}

// ─── Actualizar datos del perfil ──────────────────────────────────────────────

export async function actualizar(id: number, datos: DatosActualizarUsuario) {
  const usuario = await prisma.user.update({
    where: { id },
    data: {
      ...(datos.nombre && { nombre: datos.nombre }),
      ...(datos.apellido && { apellido: datos.apellido }),
      ...(datos.cel !== undefined && { cel: datos.cel }),
    },
    include: { rol: true },
  });

  return sanitizar(usuario);
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

export async function cambiarPassword(id: number, passwordActual: string, passwordNueva: string) {
  const usuario = await prisma.user.findUnique({ where: { id } });

  if (!usuario || !usuario.password) throw new AppError('Usuario no encontrado', 404);

  const passwordOk = await bcrypt.compare(passwordActual, usuario.password);
  if (!passwordOk) throw new AppError('Contraseña actual incorrecta', 400);

  const hash = await bcrypt.hash(passwordNueva, 10);
  await prisma.user.update({ where: { id }, data: { password: hash } });
}

// ─── Cambiar rol (solo Admin) ───────────────────────────────────────────────

export async function cambiarRol(id: number, rolId: number) {
  const rol = await prisma.rol.findUnique({ where: { id: rolId } });
  if (!rol) throw new AppError('Rol no encontrado', 404);

  const usuario = await prisma.user.update({
    where: { id },
    data: { rol_id: rolId },
    include: { rol: true },
  });

  return sanitizar(usuario);
}
// ─── Eliminar usuario (solo Admin) ───────────────────────────────────────────

export async function eliminar(id: number, adminId: number) {
  if (id === adminId) throw new AppError('No podés eliminar tu propia cuenta', 400);

  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  await prisma.user.delete({ where: { id } });
}
// ─── Aprobar / desaprobar usuario (solo Admin) ──────────────────────────────────

export async function cambiarAprobacion(id: number, aprobado: boolean) {
  const usuario = await prisma.user.update({
    where: { id },
    data: { aprobado },
    include: { rol: true },
  });

  return sanitizar(usuario);
}

// ─── Activar / desactivar cuenta ─────────────────────────────────────────────

export async function cambiarEstado(id: number, activo: boolean) {
  const usuario = await prisma.user.update({
    where: { id },
    data: { activo },
  });

  return sanitizar(usuario);
}

// ─── Solicitar alta mayorista ─────────────────────────────────────────────────

export async function solicitarAltaMayorista(usuarioId: number, mensaje?: string) {
  const solicitudExistente = await prisma.solicitudMayorista.findFirst({
    where: { usuario_id: usuarioId, estado: 'pendiente' },
  });

  if (solicitudExistente) throw new AppError('Ya tenés una solicitud pendiente', 409);

  const solicitud = await prisma.solicitudMayorista.create({
    data: {
      usuario_id: usuarioId,
      mensaje_cliente: mensaje,
    },
  });

  return solicitud;
}

// ─── Listar solicitudes mayorista ─────────────────────────────────────────────

export async function listarSolicitudesMayorista(estado?: string) {
  const solicitudes = await prisma.solicitudMayorista.findMany({
    where: { ...(estado && { estado }) },
    include: {
      usuario: { include: { rol: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return solicitudes.map((s) => ({ ...s, usuario: sanitizar(s.usuario) }));
}

// ─── Resolver solicitud (aprobar / rechazar) ──────────────────────────────────

export async function resolverSolicitud(
  solicitudId: number,
  adminId: number,
  accion: 'aprobar' | 'rechazar',
  mensajeAdmin?: string
) {
  const solicitud = await prisma.solicitudMayorista.findUnique({ where: { id: solicitudId } });
  if (!solicitud) throw new AppError('Solicitud no encontrada', 404);
  if (solicitud.estado !== 'pendiente') throw new AppError('Esta solicitud ya fue procesada', 409);

  if (accion === 'aprobar') {
    const rolMayorista = await prisma.rol.findUnique({ where: { nombre: 'Cliente Mayorista' } });
    if (!rolMayorista) throw new AppError('Error de configuración: rol mayorista no encontrado', 500);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: solicitud.usuario_id },
        data: { rol_id: rolMayorista.id, aprobado: true },
      }),
      prisma.solicitudMayorista.update({
        where: { id: solicitudId },
        data: { estado: 'aprobada', revisado_por: adminId, mensaje_admin: mensajeAdmin },
      }),
    ]);
  } else {
    await prisma.solicitudMayorista.update({
      where: { id: solicitudId },
      data: { estado: 'rechazada', revisado_por: adminId, mensaje_admin: mensajeAdmin },
    });
  }
}

