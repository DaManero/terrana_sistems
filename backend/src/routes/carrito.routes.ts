import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticarOpcional } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import { NextFunction, Request, Response } from 'express';

const router = Router();

// Función auxiliar: obtener o crear carrito según usuario o session_id
async function obtenerOCrearCarrito(usuarioId?: number, sessionId?: string) {
  if (!usuarioId && !sessionId) {
    throw new AppError('Se requiere usuario autenticado o session_id', 400);
  }

  const where = usuarioId ? { usuario_id: usuarioId } : { session_id: sessionId };

  let carrito = await prisma.carrito.findFirst({ where, include: { items: { include: { producto: true } } } });

  if (!carrito) {
    carrito = await prisma.carrito.create({
      data: { usuario_id: usuarioId, session_id: sessionId },
      include: { items: { include: { producto: true } } },
    });
  }

  return carrito;
}

// GET /api/v1/carrito
router.get('/', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const carrito = await obtenerOCrearCarrito(req.usuario?.id, sessionId);
    res.json(carrito);
  } catch (error) { next(error); }
});

// POST /api/v1/carrito/items — agregar o incrementar item
router.post('/items', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const { producto_id, cantidad } = req.body;

    const producto = await prisma.producto.findUnique({ where: { id: Number(producto_id) } });
    if (!producto || !producto.activo) throw new AppError('Producto no disponible', 404);
    if (producto.stock < Number(cantidad)) throw new AppError('Stock insuficiente', 400);

    const carrito = await obtenerOCrearCarrito(req.usuario?.id, sessionId);

    const itemExistente = await prisma.carritoItem.findUnique({
      where: { carrito_id_producto_id: { carrito_id: carrito.id, producto_id: Number(producto_id) } },
    });

    if (itemExistente) {
      const item = await prisma.carritoItem.update({
        where: { id: itemExistente.id },
        data: { cantidad: itemExistente.cantidad + Number(cantidad) },
        include: { producto: true },
      });
      res.json(item);
    } else {
      const item = await prisma.carritoItem.create({
        data: { carrito_id: carrito.id, producto_id: Number(producto_id), cantidad: Number(cantidad) },
        include: { producto: true },
      });
      res.status(201).json(item);
    }
  } catch (error) { next(error); }
});

// PATCH /api/v1/carrito/items/:itemId — actualizar cantidad
router.patch('/items/:itemId', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cantidad } = req.body;

    if (Number(cantidad) <= 0) {
      await prisma.carritoItem.delete({ where: { id: Number(req.params.itemId) } });
      res.json({ mensaje: 'Ítem eliminado' });
      return;
    }

    const item = await prisma.carritoItem.update({
      where: { id: Number(req.params.itemId) },
      data: { cantidad: Number(cantidad) },
      include: { producto: true },
    });
    res.json(item);
  } catch (error) { next(error); }
});

// DELETE /api/v1/carrito/items/:itemId
router.delete('/items/:itemId', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.carritoItem.delete({ where: { id: Number(req.params.itemId) } });
    res.json({ mensaje: 'Ítem eliminado del carrito' });
  } catch (error) { next(error); }
});

// DELETE /api/v1/carrito — vaciar carrito completo
router.delete('/', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    const carrito = await obtenerOCrearCarrito(req.usuario?.id, sessionId);
    await prisma.carritoItem.deleteMany({ where: { carrito_id: carrito.id } });
    res.json({ mensaje: 'Carrito vaciado' });
  } catch (error) { next(error); }
});

// POST /api/v1/carrito/fusionar — fusionar carrito anónimo al loguearse
router.post('/fusionar', autenticarOpcional, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.usuario) { res.status(401).json({ mensaje: 'No autenticado' }); return; }

    const { session_id } = req.body;
    if (!session_id) { res.json({ mensaje: 'No hay carrito anónimo para fusionar' }); return; }

    const carritoAnonimo = await prisma.carrito.findUnique({
      where: { session_id },
      include: { items: true },
    });

    if (!carritoAnonimo) { res.json({ mensaje: 'Carrito anónimo no encontrado' }); return; }

    let carritoUsuario = await prisma.carrito.findUnique({ where: { usuario_id: req.usuario.id } });

    if (!carritoUsuario) {
      // Asignar el carrito anónimo al usuario
      carritoUsuario = await prisma.carrito.update({
        where: { id: carritoAnonimo.id },
        data: { usuario_id: req.usuario.id, session_id: null },
      });
    } else {
      // Fusionar: mover ítems del carrito anónimo al del usuario
      for (const item of carritoAnonimo.items) {
        const existente = await prisma.carritoItem.findUnique({
          where: { carrito_id_producto_id: { carrito_id: carritoUsuario.id, producto_id: item.producto_id } },
        });

        if (existente) {
          await prisma.carritoItem.update({
            where: { id: existente.id },
            data: { cantidad: existente.cantidad + item.cantidad },
          });
        } else {
          await prisma.carritoItem.create({
            data: { carrito_id: carritoUsuario.id, producto_id: item.producto_id, cantidad: item.cantidad },
          });
        }
      }
      await prisma.carrito.delete({ where: { id: carritoAnonimo.id } });
    }

    const carritoFinal = await prisma.carrito.findUnique({
      where: { id: carritoUsuario.id },
      include: { items: { include: { producto: true } } },
    });

    res.json(carritoFinal);
  } catch (error) { next(error); }
});

export default router;
