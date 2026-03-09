import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { FiltrosVenta } from '../types';
import { generarNumeroPedido } from '../utils/tokens';
import { enviarEmail, templateConfirmacionPedido } from '../utils/email';
import { Prisma } from '@prisma/client';

interface ItemCarrito {
  producto_id: number;
  cantidad: number;
}

interface DatosCrearVenta {
  cliente_id?: number;
  guest_nombre?: string;
  guest_email?: string;
  guest_telefono?: string;
  tipo_cliente: 'minorista' | 'mayorista';
  canal?: string;
  items: ItemCarrito[];
  metodo_envio_id: number;
  direccion_id?: number;
  domicilio_envio?: string;
  codigo_descuento_id?: number;
  notas?: string;
  creado_por?: number;
  metodo_pago?: string;
}

// ─── Crear venta (sin procesar pago aún — pago_estado: pendiente) ─────────────

export async function crear(datos: DatosCrearVenta) {
  return prisma.$transaction(async (tx) => {
    // 1. Verificar productos y calcular subtotal
    const productosIds = datos.items.map((i) => i.producto_id);
    const productos = await tx.producto.findMany({
      where: { id: { in: productosIds }, activo: true },
    });

    if (productos.length !== productosIds.length) {
      throw new AppError('Uno o más productos no están disponibles', 400);
    }

    // Verificar stock suficiente
    for (const item of datos.items) {
      const prod = productos.find((p) => p.id === item.producto_id)!;
      if (prod.stock < item.cantidad) {
        throw new AppError(`Stock insuficiente para: ${prod.nombre}`, 400);
      }
    }

    // Calcular subtotal según tipo de cliente
    const esMayorista = datos.tipo_cliente === 'mayorista';
    let subtotal = new Prisma.Decimal(0);

    const itemsConPrecio = datos.items.map((item) => {
      const prod = productos.find((p) => p.id === item.producto_id)!;
      const precioUnitario = esMayorista ? prod.precio_venta_may : prod.precio_venta_min;
      const itemSubtotal = precioUnitario.mul(item.cantidad);
      subtotal = subtotal.add(itemSubtotal);
      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        subtotal: itemSubtotal,
      };
    });

    // 2. Aplicar código de descuento si corresponde
    let descuento = new Prisma.Decimal(0);

    if (datos.codigo_descuento_id) {
      const codigo = await tx.codigoDescuento.findUnique({
        where: { id: datos.codigo_descuento_id },
      });

      if (!codigo || !codigo.activo) {
        throw new AppError('Código de descuento inválido', 400);
      }

      const ahora = new Date();
      if (codigo.valido_desde && codigo.valido_desde > ahora) {
        throw new AppError('El código aún no está vigente', 400);
      }
      if (codigo.valido_hasta && codigo.valido_hasta < ahora) {
        throw new AppError('El código de descuento está vencido', 400);
      }
      if (codigo.usos_maximos !== null && codigo.usos_actuales >= codigo.usos_maximos) {
        throw new AppError('El código alcanzó su límite de usos', 400);
      }
      if (codigo.minimo_compra && subtotal.lt(codigo.minimo_compra)) {
        throw new AppError(`El código requiere una compra mínima de $${codigo.minimo_compra}`, 400);
      }

      descuento = codigo.tipo === 'porcentaje'
        ? subtotal.mul(codigo.valor).div(100)
        : codigo.valor;

      await tx.codigoDescuento.update({
        where: { id: codigo.id },
        data: { usos_actuales: { increment: 1 } },
      });
    }

    // 3. Costo de envío
    const metodoEnvio = await tx.metodoEnvio.findUnique({
      where: { id: datos.metodo_envio_id },
    });
    if (!metodoEnvio || !metodoEnvio.activo) {
      throw new AppError('Método de envío no disponible', 400);
    }

    const subtotalConDescuento = subtotal.sub(descuento);
    const costoEnvio = metodoEnvio.gratis_desde && subtotalConDescuento.gte(metodoEnvio.gratis_desde)
      ? new Prisma.Decimal(0)
      : metodoEnvio.costo;

    const total = subtotalConDescuento.add(costoEnvio);

    // 4. Crear la venta
    // Generamos un número de pedido temporal, luego lo actualizamos con el ID real
    const venta = await tx.venta.create({
      data: {
        numero_pedido: `TRR-TEMP-${Date.now()}`,
        cliente_id: datos.cliente_id,
        guest_nombre: datos.guest_nombre,
        guest_email: datos.guest_email,
        guest_telefono: datos.guest_telefono,
        tipo_cliente: datos.tipo_cliente,
        canal: datos.canal ?? 'ecommerce',
        subtotal,
        descuento,
        costo_envio: costoEnvio,
        total,
        metodo_pago: datos.metodo_pago,
        pago_estado: 'pendiente',
        metodo_envio_id: datos.metodo_envio_id,
        direccion_id: datos.direccion_id,
        domicilio_envio: datos.domicilio_envio,
        codigo_descuento_id: datos.codigo_descuento_id,
        notas: datos.notas,
        creado_por: datos.creado_por,
        items: { createMany: { data: itemsConPrecio } },
      },
      include: { items: true },
    });

    // Actualizar número de pedido con el ID real
    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: { numero_pedido: generarNumeroPedido(venta.id) },
    });

    return { ...ventaActualizada, items: venta.items };
  });
}

// ─── Confirmar pago (llamado desde webhook de MP) ─────────────────────────────

export async function confirmarPago(
  ventaId: number,
  mpPaymentId: string,
  usuarioId?: number
) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: ventaId },
      include: { items: true },
    });

    if (!venta) throw new AppError('Venta no encontrada', 404);
    if (venta.pago_estado === 'aprobado') return venta; // Idempotente

    // Actualizar estado de pago
    const ventaActualizada = await tx.venta.update({
      where: { id: ventaId },
      data: {
        pago_estado: 'aprobado',
        estado: 'confirmado',
        mp_payment_id: mpPaymentId,
      },
    });

    // Descontar stock por cada ítem (dentro de la misma transacción)
    for (const item of venta.items) {
      const producto = await tx.producto.findUnique({ where: { id: item.producto_id } });
      if (!producto) continue;

      const stockAntes = producto.stock;
      const stockDespues = stockAntes - item.cantidad;

      await tx.producto.update({
        where: { id: item.producto_id },
        data: { stock: Math.max(0, stockDespues) },
      });

      await tx.stockMovimiento.create({
        data: {
          producto_id: item.producto_id,
          tipo: 'venta',
          cantidad: -item.cantidad,
          stock_antes: stockAntes,
          stock_despues: Math.max(0, stockDespues),
          referencia_id: ventaId,
          usuario_id: usuarioId,
        },
      });
    }

    // Enviar email de confirmación
    const emailDestino = venta.guest_email;
    const nombreDestino = venta.guest_nombre ?? 'Cliente';

    if (emailDestino) {
      await enviarEmail({
        to: emailDestino,
        subject: `Pedido confirmado ${venta.numero_pedido} — Terrana`,
        html: templateConfirmacionPedido({
          nombre: nombreDestino,
          numeroPedido: venta.numero_pedido,
          total: venta.total.toFixed(2),
        }),
      }).catch(console.error); // No bloquear si el email falla
    }

    return ventaActualizada;
  });
}

// ─── Listar ventas ────────────────────────────────────────────────────────────

export async function listar(filtros: FiltrosVenta, usuarioId?: number, esAdmin = false) {
  const { estado, pagoEstado, clienteId, canal, fechaDesde, fechaHasta, pagina = 1, porPagina = 20 } = filtros;

  const where: Prisma.VentaWhereInput = {
    // Si no es admin/operador, solo puede ver sus propias ventas
    ...(!esAdmin && usuarioId && { cliente_id: usuarioId }),
    ...(estado && { estado }),
    ...(pagoEstado && { pago_estado: pagoEstado }),
    ...(clienteId && { cliente_id: clienteId }),
    ...(canal && { canal }),
    ...((fechaDesde || fechaHasta) && {
      fecha: {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta) }),
      },
    }),
  };

  const [total, ventas] = await Promise.all([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      include: {
        cliente: { omit: { password: true } },
        metodo_envio: true,
        items: { include: { producto: { select: { nombre: true, imagen_url: true } } } },
      },
      orderBy: { fecha: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);

  return { data: ventas, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) };
}

// ─── Obtener venta por ID ─────────────────────────────────────────────────────

export async function obtenerPorId(id: number) {
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: { omit: { password: true } },
      metodo_envio: true,
      direccion: true,
      codigo_descuento: true,
      items: {
        include: {
          producto: {
            select: { id: true, nombre: true, imagen_url: true, activo: true },
          },
        },
      },
      etiquetas_envio: {
        include: { generador: { omit: { password: true } } },
      },
    },
  });

  if (!venta) throw new AppError('Venta no encontrada', 404);
  return venta;
}

// ─── Actualizar estado ────────────────────────────────────────────────────────

export async function actualizarEstado(id: number, estado: string) {
  const venta = await prisma.venta.findUnique({ where: { id } });
  if (!venta) throw new AppError('Venta no encontrada', 404);

  return prisma.venta.update({ where: { id }, data: { estado } });
}
