'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Users, TrendingDown } from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value?: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? '—'}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['reportes', 'resumen'],
    queryFn: () => api.get('/reportes/ventas/resumen').then((r) => r.data),
  });

  const { data: stockBajo, isLoading: loadingStock } = useQuery({
    queryKey: ['reportes', 'stock-bajo'],
    queryFn: () => api.get('/reportes/stock/bajo?umbral=10').then((r) => r.data.productos ?? r.data),
  });

  const { data: masVendidos, isLoading: loadingMasVendidos } = useQuery({
    queryKey: ['reportes', 'mas-vendidos'],
    queryFn: () => api.get('/reportes/productos/mas-vendidos?limit=5').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen general del negocio</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas del mes"
          value={resumen?.total_ventas}
          icon={ShoppingCart}
          description={`${resumen?.cantidad_pedidos ?? 0} pedidos`}
          loading={loadingResumen}
        />
        <StatCard
          title="Facturación"
          value={resumen?.total_facturado ? `$${Number(resumen.total_facturado).toLocaleString('es-AR')}` : undefined}
          icon={TrendingDown}
          description="Total cobrado"
          loading={loadingResumen}
        />
        <StatCard
          title="Productos con stock bajo"
          value={stockBajo?.length ?? 0}
          icon={Package}
          description="Stock menor a 10 unidades"
          loading={loadingStock}
        />
        <StatCard
          title="Pedidos pendientes"
          value={resumen?.pendientes ?? 0}
          icon={Users}
          description="Sin procesar"
          loading={loadingResumen}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMasVendidos ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : masVendidos?.length > 0 ? (
              <div className="space-y-2">
                {masVendidos.map((p: { producto_id: number; nombre: string; total_vendido: number }, i: number) => (
                  <div key={p.producto_id} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-5">{i + 1}</span>
                    <span className="flex-1 text-sm truncate">{p.nombre}</span>
                    <Badge variant="secondary">{p.total_vendido} u.</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin ventas registradas aún.</p>
            )}
          </CardContent>
        </Card>

        {/* Stock bajo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos con stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStock ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : stockBajo?.length > 0 ? (
              <div className="space-y-2">
                {stockBajo.slice(0, 8).map((p: { id: number; nombre: string; stock: number }) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm truncate">{p.nombre}</span>
                    <Badge variant={p.stock === 0 ? 'destructive' : 'outline'}>
                      {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Todo el stock está en nivel normal. ✅</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
