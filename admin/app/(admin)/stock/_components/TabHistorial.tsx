'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Movimiento {
  id: number;
  tipo: string;
  cantidad: number;
  motivo?: string;
  created_at: string;
  producto: { id: number; nombre: string };
  usuario?: { id: number; nombre: string; apellido: string };
}

const TIPO_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  entrada:       { label: 'Entrada',        variant: 'default' },
  salida:        { label: 'Salida',          variant: 'destructive' },
  ajuste_manual: { label: 'Ajuste manual',   variant: 'secondary' },
  venta:         { label: 'Venta',           variant: 'outline' },
};

export function TabHistorial() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stock', 'movimientos', pagina, busquedaActiva],
    queryFn: async () => {
      const params = new URLSearchParams({ pagina: String(pagina), porPagina: '20' });
      const res = await api.get(`/stock/movimientos?${params}`);
      return res.data as { data: Movimiento[]; total: number; totalPaginas: number };
    },
  });

  const movimientos = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  // Filtro local por nombre de producto
  const filtrados = busquedaActiva
    ? movimientos.filter((m) =>
        m.producto.nombre.toLowerCase().includes(busquedaActiva.toLowerCase())
      )
    : movimientos;

  const handleBuscar = () => {
    setBusquedaActiva(busqueda);
    setPagina(1);
  };

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="Filtrar por producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
        />
        <Button variant="outline" size="icon" onClick={handleBuscar}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Operador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Sin movimientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((m) => {
                const tipo = TIPO_LABELS[m.tipo] ?? { label: m.tipo, variant: 'outline' as const };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{m.producto.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={tipo.variant}>{tipo.label}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {m.motivo ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Pág. {pagina} / {totalPaginas}</span>
          <Button variant="outline" size="icon" disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
