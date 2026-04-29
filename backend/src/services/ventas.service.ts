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

interface ItemStockVenta {
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
  descuento_manual?: number;
  costo_envio_manual?: number;
  notas?: string;
  fecha_entrega?: Date | string;
  creado_por?: number;
  metodo_pago?: string;
  permitir_descuento_manual?: boolean;
}

async function obtenerUltimoMovimientoStockVenta(
  tx: Prisma.TransactionClient,
  ventaId: number
) {
  return tx.stockMovimiento.findFirst({
    where: {
      referencia_id: ventaId,
      tipo: { in: ['venta', 'devolucion'] },
    },
    orderBy: { id: 'desc' },
    select: { id: true, tipo: true },
  });
}

async function descontarStockVentaSiCorresponde(
  tx: Prisma.TransactionClient,
  ventaId: number,
  items: ItemStockVenta[],
  usuarioId?: number
) {
  const ultimoMovimiento = await obtenerUltimoMovimientoStockVenta(tx, ventaId);

  if (ultimoMovimiento?.tipo === 'venta') return;

  for (const item of items) {
    const producto = await tx.producto.findUnique({
      where: { id: item.producto_id },
      select: { stock: true, nombre: true },
    });

    if (!producto) {
      throw new AppError(`Producto no encontrado para descontar stock: ${item.producto_id}`, 404);
    }

    if (producto.stock < item.cantidad) {
      throw new AppError('No hay stock suficiente para reactivar esta venta', 400);
    }

    const stockAntes = producto.stock;
    const stockDespues = stockAntes - item.cantidad;

    await tx.producto.update({
      where: { id: item.producto_id },
      data: { stock: stockDespues },
    });

    await tx.stockMovimiento.create({
      data: {
        producto_id: item.producto_id,
        tipo: 'venta',
        cantidad: -item.cantidad,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        referencia_id: ventaId,
        usuario_id: usuarioId,
      },
    });
  }
}

async function devolverStockVentaSiCorresponde(
  tx: Prisma.TransactionClient,
  ventaId: number,
  items: ItemStockVenta[],
  usuarioId?: number
) {
  const ultimoMovimiento = await obtenerUltimoMovimientoStockVenta(tx, ventaId);

  if (ultimoMovimiento?.tipo !== 'venta') return;

  for (const item of items) {
    const producto = await tx.producto.findUnique({
      where: { id: item.producto_id },
      select: { stock: true, nombre: true },
    });

    if (!producto) {
      throw new AppError(`Producto no encontrado para devolver stock: ${item.producto_id}`, 404);
    }

    const stockAntes = producto.stock;
    const stockDespues = stockAntes + item.cantidad;

    await tx.producto.update({
      where: { id: item.producto_id },
      data: { stock: stockDespues },
    });

    await tx.stockMovimiento.create({
      data: {
        producto_id: item.producto_id,
        tipo: 'devolucion',
        cantidad: item.cantidad,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        referencia_id: ventaId,
        usuario_id: usuarioId,
      },
    });
  }
}

// ─── Crear venta (sin procesar pago aún — pago_estado: pendiente) ─────────────

export async function crear(datos: DatosCrearVenta) {
  return prisma.$transaction(async (tx) => {
    const canalVenta = datos.canal ?? 'ecommerce';
    const descuentaStockEnCreacion = ['admin', 'whatsapp'].includes(canalVenta);

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

    // 2. Aplicar descuentos
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

    if (datos.descuento_manual !== undefined && datos.descuento_manual !== null) {
      if (!datos.permitir_descuento_manual) {
        throw new AppError('No autorizado para aplicar descuento manual', 403);
      }

      const descuentoManual = Number(datos.descuento_manual);
      if (Number.isNaN(descuentoManual) || descuentoManual < 0) {
        throw new AppError('Descuento manual invalido', 400);
      }

      descuento = descuento.add(new Prisma.Decimal(descuentoManual));
    }

    if (descuento.gt(subtotal)) {
      descuento = subtotal;
    }

    // 3. Costo de envío
    const metodoEnvio = await tx.metodoEnvio.findUnique({
      where: { id: datos.metodo_envio_id },
    });
    if (!metodoEnvio || !metodoEnvio.activo) {
      throw new AppError('Método de envío no disponible', 400);
    }

    const subtotalConDescuento = subtotal.sub(descuento);
    const costoEnvioCalculado = metodoEnvio.gratis_desde && subtotalConDescuento.gte(metodoEnvio.gratis_desde)
      ? new Prisma.Decimal(0)
      : metodoEnvio.costo;

    let costoEnvio = costoEnvioCalculado;
    if (datos.costo_envio_manual !== undefined && datos.costo_envio_manual !== null) {
      const costoManual = Number(datos.costo_envio_manual);
      if (Number.isNaN(costoManual) || costoManual < 0) {
        throw new AppError('Costo de envio manual invalido', 400);
      }
      costoEnvio = new Prisma.Decimal(costoManual);
    }

    const total = subtotalConDescuento.add(costoEnvio);

    // 4. Crear la venta
    // Generamos un número de pedido temporal, luego lo actualizamos con el ID real
    const venta = await tx.venta.create({
      data: {
        numero_pedido: `TMP-${Date.now()}`,
        cliente_id: datos.cliente_id,
        guest_nombre: datos.guest_nombre,
        guest_email: datos.guest_email,
        guest_telefono: datos.guest_telefono,
        tipo_cliente: datos.tipo_cliente,
        canal: canalVenta,
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
        fecha_entrega: datos.fecha_entrega ? new Date(datos.fecha_entrega) : null,
        creado_por: datos.creado_por,
        items: { createMany: { data: itemsConPrecio } },
      },
      include: { items: true },
    });

    // Ventas manuales: impactan stock al momento de creación
    if (descuentaStockEnCreacion) {
      for (const item of itemsConPrecio) {
        const producto = productos.find((p) => p.id === item.producto_id)!;
        const stockAntes = producto.stock;
        const stockDespues = stockAntes - item.cantidad;

        await tx.producto.update({
          where: { id: item.producto_id },
          data: { stock: stockDespues },
        });

        await tx.stockMovimiento.create({
          data: {
            producto_id: item.producto_id,
            tipo: 'venta',
            cantidad: -item.cantidad,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
            referencia_id: venta.id,
            usuario_id: datos.creado_por,
          },
        });

        producto.stock = stockDespues;
      }
    }

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

    await descontarStockVentaSiCorresponde(tx, ventaId, venta.items, usuarioId);

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
        cliente: { select: { id: true, nombre: true, apellido: true, email: true, cel: true, rol_id: true, activo: true, aprobado: true, created_at: true, updated_at: true } },
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
      cliente: { select: { id: true, nombre: true, apellido: true, email: true, cel: true, rol_id: true, activo: true, aprobado: true, created_at: true, updated_at: true } },
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
        include: { generador: { select: { id: true, nombre: true, apellido: true, email: true } } },
      },
    },
  });

  if (!venta) throw new AppError('Venta no encontrada', 404);
  return venta;
}

// ─── Actualizar estado ────────────────────────────────────────────────────────

export async function actualizarEstado(id: number, estado: string, usuarioId?: number) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({ where: { id }, include: { items: true } });
    if (!venta) throw new AppError('Venta no encontrada', 404);

    if (venta.estado === 'cancelado' && estado !== 'cancelado') {
      await descontarStockVentaSiCorresponde(tx, id, venta.items, usuarioId);
    }

    const ventaActualizada = await tx.venta.update({ where: { id }, data: { estado } });

    if (venta.estado !== 'cancelado' && estado === 'cancelado') {
      await devolverStockVentaSiCorresponde(tx, id, venta.items, usuarioId);
    }

    return ventaActualizada;
  });
}

// ─── Editar venta ─────────────────────────────────────────────────────────────

interface DatosEditarVenta {
  estado?: string;
  pago_estado?: string;
  metodo_pago?: string;
  metodo_envio_id?: number | null;
  costo_envio_manual?: number;
  notas?: string;
  fecha_entrega?: Date | string | null;
  items?: { producto_id: number; cantidad: number }[];
}

export async function editarVenta(id: number, datos: DatosEditarVenta, usuarioId?: number) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!venta) throw new AppError('Venta no encontrada', 404);

    const updateData: Prisma.VentaUpdateInput = {};
    let subtotalParaTotal = venta.subtotal;
    let costoEnvioParaTotal = venta.costo_envio;
    let debeRecalcularTotal = false;

    if (datos.estado !== undefined) updateData.estado = datos.estado;
    if (datos.pago_estado !== undefined) updateData.pago_estado = datos.pago_estado;
    if (datos.metodo_pago !== undefined) updateData.metodo_pago = datos.metodo_pago || null;
    if (datos.notas !== undefined) updateData.notas = datos.notas || null;
    if (datos.fecha_entrega !== undefined) updateData.fecha_entrega = datos.fecha_entrega ? new Date(datos.fecha_entrega) : null;

    if (datos.items !== undefined) {
      if (datos.items.length === 0) {
        throw new AppError('La venta debe tener al menos un producto', 400);
      }

      const itemsActuales = venta.items;
      const itemsNuevos = datos.items;

      const ultimoMovimiento = await obtenerUltimoMovimientoStockVenta(tx, id);
      const stockActualmenteDescontado = ultimoMovimiento?.tipo === 'venta';

      if (stockActualmenteDescontado) {
        // Ajustar diffs de ítems existentes
        for (const itemActual of itemsActuales) {
          const itemNuevo = itemsNuevos.find((i) => i.producto_id === itemActual.producto_id);
          const cantNueva = itemNuevo?.cantidad ?? 0;
          const devolver = itemActual.cantidad - cantNueva; // >0 devuelve stock, <0 descuenta más

          if (devolver !== 0) {
            if (devolver < 0) {
              // Necesita más stock
              const prod = await tx.producto.findUnique({ where: { id: itemActual.producto_id }, select: { stock: true, nombre: true } });
              if (!prod || prod.stock < -devolver) {
                throw new AppError(`Stock insuficiente para: ${prod?.nombre ?? 'producto'}`, 400);
              }
            }
            await tx.producto.update({
              where: { id: itemActual.producto_id },
              data: { stock: { increment: devolver } },
            });
          }
        }

        // Ítems completamente nuevos
        for (const itemNuevo of itemsNuevos) {
          const existia = itemsActuales.find((i) => i.producto_id === itemNuevo.producto_id);
          if (!existia) {
            const prod = await tx.producto.findUnique({ where: { id: itemNuevo.producto_id }, select: { stock: true, nombre: true } });
            if (!prod) throw new AppError('Producto no encontrado', 404);
            if (prod.stock < itemNuevo.cantidad) {
              throw new AppError(`Stock insuficiente para: ${prod.nombre}`, 400);
            }
            await tx.producto.update({
              where: { id: itemNuevo.producto_id },
              data: { stock: { increment: -itemNuevo.cantidad } },
            });
          }
        }
      }

      // Obtener precios actuales y calcular nuevo subtotal
      const productosIds = itemsNuevos.map((i) => i.producto_id);
      const productos = await tx.producto.findMany({
        where: { id: { in: productosIds } },
      });

      if (productos.length !== productosIds.length) {
        throw new AppError('Uno o más productos no encontrados', 404);
      }

      const esMayorista = venta.tipo_cliente === 'mayorista';
      let subtotal = new Prisma.Decimal(0);

      const itemsConPrecio = itemsNuevos.map((item) => {
        const prod = productos.find((p) => p.id === item.producto_id)!;
        const precioUnitario = esMayorista ? prod.precio_venta_may : prod.precio_venta_min;
        const itemSubtotal = precioUnitario.mul(item.cantidad);
        subtotal = subtotal.add(itemSubtotal);
        return {
          venta_id: id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          subtotal: itemSubtotal,
        };
      });

      await tx.ventaItem.deleteMany({ where: { venta_id: id } });
      await tx.ventaItem.createMany({ data: itemsConPrecio });

      updateData.subtotal = subtotal;
      subtotalParaTotal = subtotal;
      costoEnvioParaTotal = venta.costo_envio;
      debeRecalcularTotal = true;
    }

    if (datos.metodo_envio_id !== undefined) {
      if (datos.metodo_envio_id === null) {
        updateData.metodo_envio = { disconnect: true };
        costoEnvioParaTotal = new Prisma.Decimal(0);
      } else {
        const metodoEnvio = await tx.metodoEnvio.findUnique({
          where: { id: datos.metodo_envio_id },
        });

        if (!metodoEnvio || !metodoEnvio.activo) {
          throw new AppError('Método de envío no disponible', 400);
        }

        const subtotalConDescuento = subtotalParaTotal.sub(venta.descuento);
        const costoCalculado = metodoEnvio.gratis_desde && subtotalConDescuento.gte(metodoEnvio.gratis_desde)
          ? new Prisma.Decimal(0)
          : metodoEnvio.costo;

        updateData.metodo_envio = { connect: { id: datos.metodo_envio_id } };
        costoEnvioParaTotal = costoCalculado;
      }

      updateData.costo_envio = costoEnvioParaTotal;
      debeRecalcularTotal = true;
    }

    if (datos.costo_envio_manual !== undefined) {
      const costoManual = Number(datos.costo_envio_manual);
      if (Number.isNaN(costoManual) || costoManual < 0) {
        throw new AppError('Costo de envio manual invalido', 400);
      }

      costoEnvioParaTotal = new Prisma.Decimal(costoManual);
      updateData.costo_envio = costoEnvioParaTotal;
      debeRecalcularTotal = true;
    }

    if (debeRecalcularTotal) {
      const nuevoTotal = subtotalParaTotal.sub(venta.descuento).add(costoEnvioParaTotal);
      updateData.total = nuevoTotal.lt(0) ? new Prisma.Decimal(0) : nuevoTotal;
    }

    const estadoFinal = datos.estado ?? venta.estado;

    const ventaActualizada = await tx.venta.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, nombre: true, apellido: true, email: true, cel: true, rol_id: true, activo: true, aprobado: true, created_at: true, updated_at: true } },
        metodo_envio: true,
        direccion: true,
        codigo_descuento: true,
        items: {
          include: {
            producto: { select: { id: true, nombre: true, imagen_url: true } },
          },
        },
      },
    });

    if (venta.estado !== 'cancelado' && estadoFinal === 'cancelado') {
      await devolverStockVentaSiCorresponde(
        tx,
        id,
        ventaActualizada.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
        usuarioId
      );
    }

    if (venta.estado === 'cancelado' && estadoFinal !== 'cancelado') {
      await descontarStockVentaSiCorresponde(
        tx,
        id,
        ventaActualizada.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
        usuarioId
      );
    }

    return ventaActualizada;
  });
}
