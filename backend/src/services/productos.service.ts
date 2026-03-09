import { prisma } from '../prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { FiltrosProducto, TipoMovimientoStock } from '../types';
import { Prisma } from '@prisma/client';

// ─── Listar productos (público — con filtros y paginación) ───────────────────

export async function listar(filtros: FiltrosProducto, esMayoristaOAdmin = false) {
  const {
    categoriaId,
    subcategoriaId,
    marcaId,
    presentacionId,
    origenId,
    busqueda,
    soloConStock = false,
    soloActivos = true,
    pagina = 1,
    porPagina = 20,
    ordenar = 'nombre_asc',
  } = filtros;

  const where: Prisma.ProductoWhereInput = {
    ...(soloActivos && { activo: true }),
    ...(soloConStock && { stock: { gt: 0 } }),
    ...(categoriaId && { categoria_id: categoriaId }),
    ...(subcategoriaId && { subcategoria_id: subcategoriaId }),
    ...(marcaId && { marca_id: marcaId }),
    ...(presentacionId && { presentacion_id: presentacionId }),
    ...(origenId && { origen_id: origenId }),
    ...(busqueda && {
      nombre: { contains: busqueda, mode: 'insensitive' as const },
    }),
  };

  const orderByMap: Record<string, Prisma.ProductoOrderByWithRelationInput> = {
    precio_asc: { precio_venta_min: 'asc' },
    precio_desc: { precio_venta_min: 'desc' },
    nombre_asc: { nombre: 'asc' },
    nombre_desc: { nombre: 'desc' },
    nuevo: { created_at: 'desc' },
  };

  const [total, productos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      include: {
        categoria: true,
        subcategoria: true,
        marca: true,
        presentacion: true,
        origen: true,
        etiquetas: { include: { etiqueta: true } },
      },
      orderBy: orderByMap[ordenar] ?? { nombre: 'asc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);

  // Ocultar costo y precio mayorista si no tiene permisos
  const productosTransformados = productos.map((p) => ({
    ...p,
    costo: esMayoristaOAdmin ? p.costo : undefined,
    precio_venta_may: esMayoristaOAdmin ? p.precio_venta_may : undefined,
  }));

  return {
    data: productosTransformados,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}

// ─── Obtener un producto por ID ───────────────────────────────────────────────

export async function obtenerPorId(id: number, esMayoristaOAdmin = false) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      categoria: true,
      subcategoria: true,
      marca: true,
      presentacion: true,
      origen: true,
      proveedor: true,
      etiquetas: { include: { etiqueta: true } },
    },
  });

  if (!producto) throw new AppError('Producto no encontrado', 404);

  return {
    ...producto,
    costo: esMayoristaOAdmin ? producto.costo : undefined,
    precio_venta_may: esMayoristaOAdmin ? producto.precio_venta_may : undefined,
    proveedor: esMayoristaOAdmin ? producto.proveedor : undefined,
  };
}

// ─── Crear producto ───────────────────────────────────────────────────────────

export async function crear(datos: Prisma.ProductoUncheckedCreateInput) {
  return prisma.producto.create({
    data: datos,
    include: { categoria: true, marca: true, presentacion: true },
  });
}

// ─── Actualizar producto ──────────────────────────────────────────────────────

export async function actualizar(
  id: number,
  datos: Prisma.ProductoUncheckedUpdateInput
) {
  const existe = await prisma.producto.findUnique({ where: { id } });
  if (!existe) throw new AppError('Producto no encontrado', 404);

  return prisma.producto.update({
    where: { id },
    data: datos,
    include: { categoria: true, marca: true, presentacion: true },
  });
}

// ─── Eliminar producto (borrado lógico) ───────────────────────────────────────

export async function eliminar(id: number) {
  const existe = await prisma.producto.findUnique({ where: { id } });
  if (!existe) throw new AppError('Producto no encontrado', 404);

  return prisma.producto.update({
    where: { id },
    data: { activo: false },
  });
}

// ─── Actualizar stock con movimiento ─────────────────────────────────────────

export async function ajustarStock(
  productoId: number,
  cantidad: number,
  tipo: TipoMovimientoStock,
  usuarioId?: number,
  referenciaId?: number,
  motivo?: string
) {
  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new AppError('Producto no encontrado', 404);

    const stockAntes = producto.stock;
    const stockDespues = stockAntes + cantidad;

    if (stockDespues < 0) {
      throw new AppError('Stock insuficiente', 400);
    }

    await tx.producto.update({
      where: { id: productoId },
      data: { stock: stockDespues },
    });

    await tx.stockMovimiento.create({
      data: {
        producto_id: productoId,
        tipo,
        cantidad,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        referencia_id: referenciaId,
        motivo,
        usuario_id: usuarioId,
      },
    });

    return { stockAntes, stockDespues };
  });
}

// ─── Sincronizar etiquetas de un producto ────────────────────────────────────

export async function sincronizarEtiquetas(
  productoId: number,
  etiquetaIds: number[]
) {
  // Borrar todas las etiquetas actuales y recrear
  await prisma.productoEtiqueta.deleteMany({ where: { producto_id: productoId } });

  if (etiquetaIds.length > 0) {
    await prisma.productoEtiqueta.createMany({
      data: etiquetaIds.map((etiqueta_id) => ({ producto_id: productoId, etiqueta_id })),
    });
  }
}
