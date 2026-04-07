'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Eye, Plus, SlidersHorizontal, X, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { DrawerDetalleVenta } from './DrawerDetalleVenta';
import { DialogNuevaVenta } from './DialogNuevaVenta';
import {
  type VentaListItem,
  type EstadoVenta,
  type EstadoPago,
  ESTADO_LABELS,
  PAGO_LABELS,
  CANAL_LABELS,
  estadoClase,
  pagoVariant,
  formatFecha,
  formatMonto,
} from './ventas-utils';

const ESTADOS_VENTA = Object.entries(ESTADO_LABELS) as [EstadoVenta, string][];
const ESTADOS_PAGO = Object.entries(PAGO_LABELS) as [EstadoPago, string][];
const CANALES = Object.entries(CANAL_LABELS) as [string, string][];

export function TabVentas() {
  const qc = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPago, setFiltroPago] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nuevaVentaOpen, setNuevaVentaOpen] = useState(false);

  const params = new URLSearchParams({ pagina: String(pagina), porPagina: '15' });
  if (filtroEstado) params.set('estado', filtroEstado);
  if (filtroPago) params.set('pagoEstado', filtroPago);
  if (filtroCanal) params.set('canal', filtroCanal);
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', pagina, filtroEstado, filtroPago, filtroCanal, fechaDesde, fechaHasta],
    queryFn: () => api.get(`/ventas?${params.toString()}`).then((r) => r.data),
  });

  const ventas: VentaListItem[] = data?.data ?? [];
  const totalPaginas: number = data?.totalPaginas ?? 1;
  const totalRegistros: number = data?.total ?? 0;

  const generarLotes = useMutation({
    mutationFn: () => api.post('/lotes-envio/generar'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['lotes-envio'] });
      toast.success(res.data?.mensaje ?? 'Lotes generados');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.mensaje ??
        'No se pudieron generar lotes';
      toast.error(msg);
    },
  });

  const hayFiltros = filtroEstado || filtroPago || filtroCanal || fechaDesde || fechaHasta;

  function limpiarFiltros() {
    setFiltroEstado('');
    setFiltroPago('');
    setFiltroCanal('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  }

  function abrirDetalle(id: number) {
    setVentaSeleccionada(id);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de filtros ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Filtros</span>
        </div>

        <Select
          value={filtroEstado || 'todos'}
          onValueChange={(v) => {
            setFiltroEstado(v === 'todos' ? '' : v);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS_VENTA.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroPago || 'todos'}
          onValueChange={(v) => {
            setFiltroPago(v === 'todos' ? '' : v);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los pagos</SelectItem>
            {ESTADOS_PAGO.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroCanal || 'todos'}
          onValueChange={(v) => {
            setFiltroCanal(v === 'todos' ? '' : v);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los canales</SelectItem>
            {CANALES.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="w-36 text-sm"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPagina(1);
            }}
            title="Desde"
          />
          <span className="text-muted-foreground text-xs px-0.5">–</span>
          <Input
            type="date"
            className="w-36 text-sm"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setPagina(1);
            }}
            title="Hasta"
          />
        </div>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1 h-8">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {isLoading ? '...' : `${totalRegistros} ${totalRegistros === 1 ? 'venta' : 'ventas'}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => generarLotes.mutate()}
          disabled={generarLotes.isPending}
        >
          <PackagePlus className="h-4 w-4" />
          {generarLotes.isPending ? 'Generando...' : 'Generar lotes'}
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => setNuevaVentaOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva venta
        </Button>
      </div>

      {/* ── Tabla ────────────────────────────────────────────── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">N° Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Canal</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Pago</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : ventas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                  No se encontraron ventas
                  {hayFiltros && (
                    <span className="block text-xs mt-1">
                      Intentá limpiar los filtros
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((v) => {
                const nombreCliente = v.cliente
                  ? `${v.cliente.nombre} ${v.cliente.apellido}`
                  : (v.guest_nombre ?? 'Invitado');
                const emailCliente = v.cliente?.email ?? v.guest_email ?? '—';

                return (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => abrirDetalle(v.id)}
                  >
                    <TableCell className="font-mono text-sm font-semibold">
                      {v.numero_pedido}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatFecha(v.fecha)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium leading-tight">{nombreCliente}</p>
                      <p className="text-xs text-muted-foreground">{emailCliente}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {CANAL_LABELS[v.canal as keyof typeof CANAL_LABELS] ?? v.canal}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {v.items?.length ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatMonto(v.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pagoVariant(v.pago_estado)} className="text-xs">
                        {PAGO_LABELS[v.pago_estado] ?? v.pago_estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${estadoClase(v.estado)}`}
                      >
                        {ESTADO_LABELS[v.estado] ?? v.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver detalle"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirDetalle(v.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Paginación ───────────────────────────────────────── */}
      {(totalPaginas > 1 || ventas.length > 0) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Drawer detalle ───────────────────────────────────── */}
      <DrawerDetalleVenta
        ventaId={ventaSeleccionada}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* ── Dialog nueva venta ───────────────────────────────── */}
      <DialogNuevaVenta
        open={nuevaVentaOpen}
        onClose={() => setNuevaVentaOpen(false)}
      />
    </div>
  );
}
