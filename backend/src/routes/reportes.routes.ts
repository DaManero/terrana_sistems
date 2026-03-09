import { Router } from 'express';
import { prisma } from '../prisma/client';
import { autenticar } from '../middlewares/auth.middleware';
import { requiereRol } from '../middlewares/roles.middleware';

const router = Router();

// Todos los reportes requieren Admin o Operador
router.use(autenticar, requiereRol('Admin', 'Operador'));

// GET /api/v1/reportes/ventas/resumen?fechaDesde=&fechaHasta=
router.get('/ventas/resumen', async (req, res, next) => {
  try {
    const fechaDesde = req.query.fechaDesde ? new Date(req.query.fechaDesde as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fechaHasta = req.query.fechaHasta ? new Date(req.query.fechaHasta as string) : new Date();

    const [ventasAprobadas, ventasPorCanal, ventasPorEstado] = await Promise.all([
      // Total facturado en el período
      prisma.venta.aggregate({
        where: {
          pago_estado: 'aprobado',
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
        _sum: { total: true, descuento: true },
        _count: { id: true },
      }),

      // Ventas agrupadas por canal
      prisma.venta.groupBy({
        by: ['canal'],
        _sum: { total: true },
        _count: { id: true },
        where: {
          pago_estado: 'aprobado',
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
      }),

      // Ventas agrupadas por estado
      prisma.venta.groupBy({
        by: ['estado'],
        _count: { id: true },
        where: {
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
      }),
    ]);

    res.json({
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      totalFacturado: ventasAprobadas._sum.total ?? 0,
      totalDescuentos: ventasAprobadas._sum.descuento ?? 0,
      cantidadPedidos: ventasAprobadas._count.id,
      porCanal: ventasPorCanal,
      porEstado: ventasPorEstado,
    });
  } catch (error) { next(error); }
});

// GET /api/v1/reportes/productos/mas-vendidos?limit=10
router.get('/productos/mas-vendidos', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);

    const masVendidos = await prisma.$queryRaw<Array<{ id: number; nombre: string; total_vendido: bigint; total_ingresos: string }>>`
      SELECT p.id, p.nombre,
             SUM(vi.cantidad) AS total_vendido,
             SUM(vi.subtotal) AS total_ingresos
      FROM venta_items vi
      JOIN productos p ON vi.producto_id = p.id
      JOIN ventas v ON vi.venta_id = v.id
      WHERE v.pago_estado = 'aprobado'
      GROUP BY p.id, p.nombre
      ORDER BY total_vendido DESC
      LIMIT ${limit}
    `;

    res.json(masVendidos.map((p) => ({
      ...p,
      total_vendido: Number(p.total_vendido),
    })));
  } catch (error) { next(error); }
});

// GET /api/v1/reportes/stock/bajo?umbral=5
router.get('/stock/bajo', async (req, res, next) => {
  try {
    const umbral = Number(req.query.umbral ?? 5);

    const productos = await prisma.producto.findMany({
      where: { activo: true, stock: { lte: umbral } },
      include: { categoria: true, marca: true },
      orderBy: { stock: 'asc' },
    });

    res.json({ umbral, productos });
  } catch (error) { next(error); }
});

// GET /api/v1/reportes/clientes/nuevos?meses=3
router.get('/clientes/nuevos', async (req, res, next) => {
  try {
    const meses = Number(req.query.meses ?? 3);
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses);

    const clientes = await prisma.$queryRaw<Array<{ mes: string; cantidad: bigint }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS mes,
             COUNT(*) AS cantidad
      FROM users
      WHERE created_at >= ${desde}
        AND rol_id IN (SELECT id FROM roles WHERE nombre IN ('Cliente Minorista', 'Cliente Mayorista'))
      GROUP BY mes
      ORDER BY mes ASC
    `;

    res.json(clientes.map((c) => ({ ...c, cantidad: Number(c.cantidad) })));
  } catch (error) { next(error); }
});

export default router;
