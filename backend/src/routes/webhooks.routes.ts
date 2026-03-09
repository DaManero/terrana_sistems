import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { confirmarPago } from '../services/ventas.service';

const router = Router();

/**
 * POST /api/v1/webhooks/mercadopago
 *
 * MercadoPago envía una notificación cuando cambia el estado de un pago.
 * El body llega como raw (configurado en app.ts) para poder validar la firma.
 * 
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
router.post('/mercadopago', async (req: Request, res: Response) => {
  // Responder 200 de inmediato para que MP no reintente
  res.sendStatus(200);

  try {
    // Validar firma HMAC-SHA256
    const signature = req.headers['x-signature'] as string;
    const requestId = req.headers['x-request-id'] as string;

    if (process.env.MP_WEBHOOK_SECRET && signature) {
      const query = req.query as Record<string, string>;
      const dataId = query['data.id'] ?? '';

      const manifest = `id:${dataId};request-id:${requestId};ts:${signature.split(',').find((s) => s.startsWith('ts='))?.split('=')[1]};`;
      const hmac = crypto
        .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      const receivedHash = signature.split(',').find((s) => s.startsWith('v1='))?.split('=')[1];

      if (hmac !== receivedHash) {
        console.warn('⚠️  Webhook MP: firma inválida');
        return;
      }
    }

    const body = JSON.parse(req.body.toString()) as {
      type: string;
      data?: { id?: string };
      action?: string;
    };

    // Solo procesar notificaciones de pagos aprobados
    if (body.type !== 'payment' || !body.data?.id) return;

    const mpPaymentId = body.data.id;

    // Buscar la venta por mp_payment_id o por preferencia
    // MP envía el payment_id — buscamos la venta que lo tenga registrado
    // o que esté pendiente y corresponda a ese pago
    const { MercadoPagoConfig, Payment } = await import('mercadopago');

    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const payment = await new Payment(mp).get({ id: mpPaymentId });

    if (!payment || !payment.status) return;

    // El external_reference que seteamos al crear la preferencia es el ID de la venta
    const ventaId = payment.external_reference ? Number(payment.external_reference) : null;

    if (!ventaId) {
      console.warn('⚠️  Webhook MP: no se encontró external_reference en el pago', mpPaymentId);
      return;
    }

    if (payment.status === 'approved') {
      await confirmarPago(ventaId, mpPaymentId);
      console.log(`✅ Pago aprobado para venta ${ventaId} (MP ID: ${mpPaymentId})`);
    } else if (payment.status === 'rejected') {
      await prisma.venta.update({
        where: { id: ventaId },
        data: { pago_estado: 'rechazado', mp_payment_id: mpPaymentId },
      });
      console.log(`❌ Pago rechazado para venta ${ventaId}`);
    } else if (payment.status === 'refunded') {
      await prisma.venta.update({
        where: { id: ventaId },
        data: { pago_estado: 'reembolsado' },
      });
    }
  } catch (err) {
    console.error('Error procesando webhook de MercadoPago:', err);
  }
});

/**
 * POST /api/v1/webhooks/mercadopago/crear-preferencia
 * 
 * Crea una preferencia de pago en MP y devuelve la URL al frontend.
 * Se llama después de crear la venta (pago_estado: pendiente).
 */
router.post('/mercadopago/crear-preferencia', async (req: Request, res: Response) => {
  try {
    const { venta_id } = req.body;

    const venta = await prisma.venta.findUnique({
      where: { id: Number(venta_id) },
      include: {
        items: {
          include: { producto: { select: { nombre: true } } },
        },
      },
    });

    if (!venta) { res.status(404).json({ mensaje: 'Venta no encontrada' }); return; }

    const { MercadoPagoConfig, Preference } = await import('mercadopago');

    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

    const preference = await new Preference(mp).create({
      body: {
        items: venta.items.map((item) => ({
          id: String(item.producto_id),
          title: item.producto.nombre,
          quantity: item.cantidad,
          unit_price: Number(item.precio_unitario),
          currency_id: 'ARS',
        })),
        external_reference: String(venta.id),
        back_urls: {
          success: `${process.env.ECOMMERCE_URL}/checkout/success`,
          pending: `${process.env.ECOMMERCE_URL}/checkout/pending`,
          failure: `${process.env.ECOMMERCE_URL}/checkout/failure`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/v1/webhooks/mercadopago`,
        statement_descriptor: 'TERRANA',
      },
    });

    await prisma.venta.update({
      where: { id: venta.id },
      data: { metodo_pago: 'MercadoPago' },
    });

    res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
    });
  } catch (err) {
    console.error('Error creando preferencia MP:', err);
    res.status(500).json({ mensaje: 'Error al crear la preferencia de pago' });
  }
});

export default router;
