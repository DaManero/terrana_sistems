import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol, esOwnerOAdmin } from '../middlewares/roles.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';

const router = Router();

// ─── Listado de usuarios (Admin / Operador) ───────────────────────────────────

// GET /api/v1/users
router.get('/', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Number(req.query.porPagina ?? 20);
    const busqueda = req.query.busqueda as string | undefined;
    const rolId = req.query.rolId ? Number(req.query.rolId) : undefined;

    const where = {
      ...(busqueda && {
        OR: [
          { nombre: { contains: busqueda, mode: 'insensitive' as const } },
          { apellido: { contains: busqueda, mode: 'insensitive' as const } },
          { email: { contains: busqueda, mode: 'insensitive' as const } },
        ],
      }),
      ...(rolId && { rol_id: rolId }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { rol: true },
        orderBy: { created_at: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        omit: { password: true },
      }),
    ]);

    res.json({ data: users, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) });
  } catch (error) { next(error); }
});

// GET /api/v1/users/:id
router.get('/:id', autenticar, esOwnerOAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: { rol: true, direcciones: true },
      omit: { password: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    res.json(user);
  } catch (error) { next(error); }
});

// PATCH /api/v1/users/:id — el propio usuario o Admin
router.patch('/:id', autenticar, esOwnerOAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, apellido, cel } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { ...(nombre && { nombre }), ...(apellido && { apellido }), ...(cel && { cel }) },
      include: { rol: true },
      omit: { password: true },
    });
    res.json(user);
  } catch (error) { next(error); }
});

// PATCH /api/v1/users/:id/password — el propio usuario
router.patch('/:id/password', autenticar, esOwnerOAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user || !user.password) throw new AppError('Usuario no encontrado', 404);

    const ok = await bcrypt.compare(passwordActual, user.password);
    if (!ok) throw new AppError('Contraseña actual incorrecta', 400);

    const hash = await bcrypt.hash(passwordNueva, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) { next(error); }
});

// PATCH /api/v1/users/:id/estado — Admin: activar/desactivar
router.patch('/:id/estado', autenticar, requiereRol('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { activo: req.body.activo },
      omit: { password: true },
    });
    res.json(user);
  } catch (error) { next(error); }
});

// ─── Solicitudes mayorista ────────────────────────────────────────────────────

// POST /api/v1/users/mayorista/solicitar
router.post('/mayorista/solicitar', autenticar, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.usuario) { res.status(401).json({ mensaje: 'No autenticado' }); return; }

    const solicitudExistente = await prisma.solicitudMayorista.findFirst({
      where: { usuario_id: req.usuario.id, estado: 'pendiente' },
    });
    if (solicitudExistente) throw new AppError('Ya tenés una solicitud pendiente', 409);

    const solicitud = await prisma.solicitudMayorista.create({
      data: {
        usuario_id: req.usuario.id,
        mensaje_cliente: req.body.mensaje,
      },
    });
    res.status(201).json(solicitud);
  } catch (error) { next(error); }
});

// GET /api/v1/users/mayorista/solicitudes — Admin / Operador
router.get('/mayorista/solicitudes', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const estado = req.query.estado as string | undefined;
    const solicitudes = await prisma.solicitudMayorista.findMany({
      where: { ...(estado && { estado }) },
      include: { usuario: { omit: { password: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(solicitudes);
  } catch (error) { next(error); }
});

// PATCH /api/v1/users/mayorista/solicitudes/:id — Admin / Operador aprueban/rechazan
router.patch('/mayorista/solicitudes/:id', autenticar, requiereRol('Admin', 'Operador'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.usuario) { res.status(401).json({ mensaje: 'No autenticado' }); return; }

    const { accion, mensaje } = req.body as { accion: 'aprobar' | 'rechazar'; mensaje?: string };
    const solicitudId = Number(req.params.id);

    const solicitud = await prisma.solicitudMayorista.findUnique({
      where: { id: solicitudId },
    });
    if (!solicitud) throw new AppError('Solicitud no encontrada', 404);

    if (accion === 'aprobar') {
      const rolMayorista = await prisma.rol.findUnique({ where: { nombre: 'Cliente Mayorista' } });
      if (!rolMayorista) throw new AppError('Rol mayorista no encontrado', 500);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: solicitud.usuario_id },
          data: { rol_id: rolMayorista.id, aprobado: true },
        }),
        prisma.solicitudMayorista.update({
          where: { id: solicitudId },
          data: { estado: 'aprobada', revisado_por: req.usuario.id, mensaje_admin: mensaje },
        }),
      ]);
    } else {
      await prisma.solicitudMayorista.update({
        where: { id: solicitudId },
        data: { estado: 'rechazada', revisado_por: req.usuario.id, mensaje_admin: mensaje },
      });
    }

    res.json({ mensaje: `Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}` });
  } catch (error) { next(error); }
});

export default router;
