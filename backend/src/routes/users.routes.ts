import { Router } from 'express';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol, esOwnerOAdmin } from '../middlewares/roles.middleware';
import * as usersController from '../controllers/users.controller';
import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { generarTokenAleatorio, calcularExpiracion } from '../utils/tokens';
import { enviarEmail, templateSetPassword } from '../utils/email';

const router = Router();

// ─── Roles (para selectores en el frontend) ───────────────────────────────────

// GET /api/v1/users/roles
router.get('/roles', autenticar, requiereRol('Admin', 'Operador'), async (_req, res, next) => {
  try {
    const roles = await prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
    res.json(roles);
  } catch (error) { next(error); }
});

// ─── Perfil propio ────────────────────────────────────────────────────────────

// GET /api/v1/users/me
router.get('/me', autenticar, usersController.miPerfil);

// ─── Solicitudes mayorista (rutas específicas antes de /:id) ─────────────────

// POST /api/v1/users/mayorista/solicitar
router.post('/mayorista/solicitar', autenticar, usersController.solicitarAltaMayorista);

// GET /api/v1/users/mayorista/solicitudes
router.get('/mayorista/solicitudes', autenticar, requiereRol('Admin', 'Operador'), usersController.listarSolicitudesMayorista);

// PATCH /api/v1/users/mayorista/solicitudes/:id
router.patch('/mayorista/solicitudes/:id', autenticar, requiereRol('Admin', 'Operador'), usersController.resolverSolicitud);

// ─── CRUD de usuarios ─────────────────────────────────────────────────────────

// POST /api/v1/users — solo Admin, crea un usuario directamente
router.post('/', autenticar, requiereRol('Admin'), async (req, res, next) => {
  try {
    const {
      nombre, apellido, email, cel, rol_id, aprobado, observaciones,
      enviarActivacion,
      // dirección (obligatoria desde el frontend)
      calle, piso_depto, localidad, provincia, codigo_postal,
    } = req.body;

    if (!nombre || !apellido || !rol_id) {
      throw new AppError('nombre, apellido y rol_id son requeridos', 400);
    }
    if (!calle || !localidad || !provincia || !codigo_postal) {
      throw new AppError('calle, localidad, provincia y codigo_postal son requeridos', 400);
    }

    const emailNorm = email?.trim().toLowerCase() || null;

    // Verificar duplicado de email solo si se proveyó
    if (emailNorm) {
      const existente = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (existente) throw new AppError('Ya existe una cuenta con ese email', 409);
    }

    const rol = await prisma.rol.findUnique({ where: { id: Number(rol_id) } });
    if (!rol) throw new AppError('Rol no encontrado', 404);

    // Solo enviar activación si hay email
    const debeEnviarActivacion = !!emailNorm && (enviarActivacion === true || enviarActivacion === 'true');

    const usuario = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          email: emailNorm,
          password: null,
          cel: cel?.trim() || null,
          rol_id: Number(rol_id),
          activo: true,
          aprobado: aprobado === true || aprobado === 'true',
          observaciones: observaciones?.trim() || null,
        },
        include: { rol: true },
      });

      await tx.direccion.create({
        data: {
          usuario_id: user.id,
          calle: calle.trim(),
          piso_depto: piso_depto?.trim() || null,
          localidad: localidad.trim(),
          provincia: provincia.trim(),
          codigo_postal: codigo_postal.trim(),
          telefono: cel?.trim() || null,
          predeterminada: true,
        },
      });

      if (debeEnviarActivacion) {
        const token = generarTokenAleatorio();
        const ECOMMERCE_URL = process.env.ECOMMERCE_URL ?? 'http://localhost:3000';
        await tx.passwordResetToken.create({
          data: {
            usuario_id: user.id,
            token,
            tipo: 'set_password',
            expira_at: calcularExpiracion(48),
          },
        });
        // Enviamos el email fuera de la transacción (no bloquea el commit)
        // Guardamos referencia para enviar después
        (user as unknown as { _activacionToken: string; _activacionLink: string })._activacionToken = token;
        (user as unknown as { _activacionToken: string; _activacionLink: string })._activacionLink =
          `${ECOMMERCE_URL}/auth/set-password?token=${token}`;
      }

      return user;
    });

    // Enviar email de activación fuera de la transacción
    if (debeEnviarActivacion) {
      const u = usuario as unknown as { _activacionLink: string };
      await enviarEmail({
        to: usuario.email ?? '',
        subject: 'Activá tu cuenta en Terrana',
        html: templateSetPassword({ nombre: usuario.nombre, link: u._activacionLink }),
      }).catch(() => {/* no bloquear si falla el email */});
    }

    const { password: _p, ...safe } = usuario;
    res.status(201).json({ ...safe, activacionEnviada: debeEnviarActivacion });
  } catch (error) { next(error); }
});

// GET /api/v1/users
router.get('/', autenticar, requiereRol('Admin', 'Operador'), usersController.listar);

// GET /api/v1/users/:id
router.get('/:id', autenticar, esOwnerOAdmin, usersController.obtenerPorId);

// PATCH /api/v1/users/:id
router.patch('/:id', autenticar, esOwnerOAdmin, usersController.actualizar);

// PATCH /api/v1/users/:id/password
router.patch('/:id/password', autenticar, esOwnerOAdmin, usersController.cambiarPassword);

// PATCH /api/v1/users/:id/aprobacion — solo Admin
router.patch('/:id/aprobacion', autenticar, requiereRol('Admin'), usersController.cambiarAprobacion);

// PATCH /api/v1/users/:id/rol — solo Admin
router.patch('/:id/rol', autenticar, requiereRol('Admin'), usersController.cambiarRol);

// PATCH /api/v1/users/:id/estado — solo Admin
router.patch('/:id/estado', autenticar, requiereRol('Admin'), usersController.cambiarEstado);

// DELETE /api/v1/users/:id — solo Admin
router.delete('/:id', autenticar, requiereRol('Admin'), usersController.eliminar);

// GET /api/v1/usuarios/:id/direcciones — Admin/Operador (para formulario de nueva venta)
router.get('/:id/direcciones', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return; }
    const direcciones = await prisma.direccion.findMany({
      where: { usuario_id: id },
      orderBy: [{ predeterminada: 'desc' }, { created_at: 'desc' }],
    });
    res.json(direcciones);
  } catch (error) { next(error); }
});

export default router;
