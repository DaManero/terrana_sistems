import { Router } from 'express';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';
import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { buildLoteEnvioPdf } from '../utils/lotes-envio-pdf';

const router = Router();
const prismaAny = prisma as any;

function generarNumeroLote(metodoEnvioId: number): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `LE${yyyy}${mm}${dd}${hh}${mi}${ss}-${metodoEnvioId}`;
}

async function obtenerLoteCompleto(id: number) {
  return prismaAny.loteEnvio.findUnique({
    where: { id },
    include: {
      metodo_envio: true,
      generador: { select: { id: true, nombre: true, apellido: true } },
      ventas: {
        include: {
          cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
          direccion: true,
          items: {
            include: {
              producto: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { fecha: 'asc' },
      },
    },
  });
}

const ESTADOS_EDITABLES_LOTE = ['despachado', 'entregado', 'en_preparacion'] as const;

// GET /api/v1/lotes-envio
router.get('/', autenticar, requiereRol('Admin', 'Operador'), async (_req, res, next) => {
  try {
    const lotes = await prismaAny.loteEnvio.findMany({
      include: {
        metodo_envio: true,
        generador: { select: { id: true, nombre: true, apellido: true } },
        ventas: {
          include: {
            cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
            direccion: true,
            items: {
              include: {
                producto: { select: { id: true, nombre: true } },
              },
            },
          },
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(lotes);
  } catch (error) { next(error); }
});

// PATCH /api/v1/lotes-envio/:loteId/ventas/:ventaId/estado
router.patch('/:loteId/ventas/:ventaId/estado', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const loteId = Number(req.params.loteId);
    const ventaId = Number(req.params.ventaId);
    const estado = String(req.body?.estado ?? '').trim();
    const motivo = String(req.body?.motivo ?? '').trim();

    if (Number.isNaN(loteId) || Number.isNaN(ventaId)) {
      throw new AppError('IDs inválidos', 400);
    }

    if (!ESTADOS_EDITABLES_LOTE.includes(estado as (typeof ESTADOS_EDITABLES_LOTE)[number])) {
      throw new AppError('Estado inválido para edición en lote', 400);
    }

    const lote = await prismaAny.loteEnvio.findUnique({
      where: { id: loteId },
      select: { id: true },
    });

    if (!lote) throw new AppError('Lote de envío no encontrado', 404);

    const venta = await prisma.venta.findFirst({
      where: {
        id: ventaId,
        lote_envio_id: loteId,
      },
      select: { id: true, numero_pedido: true, notas: true },
    });

    if (!venta) throw new AppError('La venta no pertenece al lote indicado', 404);

    const data: { estado: string; lote_envio_id?: number | null; notas?: string | null } = { estado };

    // Si vuelve del transportista, la dejamos lista para re-lotear.
    if (estado === 'en_preparacion') {
      if (!motivo) {
        throw new AppError('Debes indicar el motivo de la devolución', 400);
      }

      data.lote_envio_id = null;

      const fecha = new Date().toLocaleString('es-AR');
      const lineaMotivo = `[${fecha}] Devuelto por transportista: ${motivo}`;
      data.notas = venta.notas ? `${venta.notas}\n${lineaMotivo}` : lineaMotivo;
    }

    const ventaActualizada = await prisma.venta.update({
      where: { id: ventaId },
      data,
      include: {
        cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
        direccion: true,
        items: {
          include: { producto: { select: { id: true, nombre: true } } },
        },
      },
    });

    const loteActualizado = await obtenerLoteCompleto(loteId);

    res.json({
      mensaje: `Venta ${ventaActualizada.numero_pedido} actualizada a ${estado}`,
      venta: ventaActualizada,
      lote: loteActualizado,
    });
  } catch (error) { next(error); }
});

// GET /api/v1/lotes-envio/:id/pdf
router.get('/:id/pdf', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError('ID de lote invalido', 400);

    const lote = await obtenerLoteCompleto(id);
    if (!lote) throw new AppError('Lote de envio no encontrado', 404);

    const doc = buildLoteEnvioPdf(lote);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lote-${lote.numero}.pdf"`);

    doc.pipe(res);
    doc.end();
  } catch (error) { next(error); }
});

// POST /api/v1/lotes-envio/generar
router.post('/generar', autenticar, requiereRol('Admin', 'Operador'), async (req, res, next) => {
  try {
    const generadoPor = req.usuario?.id;

    const lotes = await prisma.$transaction(async (tx) => {
      const ventasPendientes = await tx.venta.findMany({
        where: {
          estado: 'en_preparacion',
          lote_envio_id: null,
          metodo_envio_id: { not: null },
        },
        include: {
          cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
          metodo_envio: true,
        },
        orderBy: [{ metodo_envio_id: 'asc' }, { fecha: 'asc' }],
      });

      if (ventasPendientes.length === 0) {
        throw new AppError('No hay ventas en preparación para lotear', 400);
      }

      const porMetodo = new Map<number, typeof ventasPendientes>();
      for (const venta of ventasPendientes) {
        if (!venta.metodo_envio_id) continue;
        const grupo = porMetodo.get(venta.metodo_envio_id) ?? [];
        grupo.push(venta);
        porMetodo.set(venta.metodo_envio_id, grupo);
      }

      if (porMetodo.size === 0) {
        throw new AppError('No hay ventas con método de envío asignado para lotear', 400);
      }

      const creados: Array<{
        id: number;
        numero: string;
        metodo_envio_id: number;
        total_ventas: number;
      }> = [];

      for (const [metodoEnvioId, ventas] of porMetodo.entries()) {
        const txAny = tx as any;
        const lote = await txAny.loteEnvio.create({
          data: {
            numero: generarNumeroLote(metodoEnvioId),
            metodo_envio_id: metodoEnvioId,
            generado_por: generadoPor,
            total_ventas: ventas.length,
          },
        });

        await tx.venta.updateMany({
          where: { id: { in: ventas.map((v) => v.id) } },
          data: {
            estado: 'despachado',
            lote_envio_id: lote.id,
          },
        });

        creados.push({
          id: lote.id,
          numero: lote.numero,
          metodo_envio_id: metodoEnvioId,
          total_ventas: ventas.length,
        });
      }

      return creados;
    });

    const lotesCompletos = await prismaAny.loteEnvio.findMany({
      where: { id: { in: lotes.map((l) => l.id) } },
      include: {
        metodo_envio: true,
        generador: { select: { id: true, nombre: true, apellido: true } },
        ventas: {
          include: {
            cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
            direccion: true,
            items: {
              include: {
                producto: { select: { id: true, nombre: true } },
              },
            },
          },
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(201).json({
      mensaje: `Se generaron ${lotesCompletos.length} lotes de envío`,
      lotes: lotesCompletos,
    });
  } catch (error) { next(error); }
});

export default router;
