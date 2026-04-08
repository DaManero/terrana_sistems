'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PackagePlus, Eye, FileDown } from 'lucide-react';

interface ClienteLote {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface VentaLote {
  id: number;
  numero_pedido: string;
  estado: string;
  fecha: string;
  total: string | number;
  cliente: ClienteLote | null;
  guest_nombre?: string | null;
  guest_email?: string | null;
  domicilio_envio?: string | null;
  direccion?: {
    calle?: string | null;
    piso_depto?: string | null;
    localidad?: string | null;
    provincia?: string | null;
    codigo_postal?: string | null;
    pais?: string | null;
  } | null;
  items: Array<{
    id: number;
    cantidad: number;
    producto: { id: number; nombre: string };
  }>;
}

interface LoteEnvio {
  id: number;
  numero: string;
  total_ventas: number;
  created_at: string;
  metodo_envio: { id: number; nombre: string };
  generador?: { id: number; nombre: string; apellido: string } | null;
  ventas: VentaLote[];
}

export function TabLotesEnvio() {
  const qc = useQueryClient();
  const [loteDetalle, setLoteDetalle] = useState<LoteEnvio | null>(null);
  const [estadoEdicion, setEstadoEdicion] = useState<Record<number, string>>({});
  const [motivoEdicion, setMotivoEdicion] = useState<Record<number, string>>({});

  const { data: lotes = [], isLoading } = useQuery<LoteEnvio[]>({
    queryKey: ['lotes-envio'],
    queryFn: () => api.get('/lotes-envio').then((r) => r.data),
  });

  const generarLotes = useMutation({
    mutationFn: () => api.post('/lotes-envio/generar'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['lotes-envio'] });
      qc.invalidateQueries({ queryKey: ['ventas'] });
      toast.success(res.data?.mensaje ?? 'Lotes generados');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.mensaje ??
        'No se pudieron generar los lotes';
      toast.error(msg);
    },
  });

  const actualizarEstadoVenta = useMutation({
    mutationFn: ({ loteId, ventaId, estado, motivo }: { loteId: number; ventaId: number; estado: string; motivo?: string }) =>
      api.patch(`/lotes-envio/${loteId}/ventas/${ventaId}/estado`, { estado, motivo }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['lotes-envio'] });
      qc.invalidateQueries({ queryKey: ['ventas'] });
      const lote = res.data?.lote as LoteEnvio | undefined;
      if (lote) setLoteDetalle(lote);
      toast.success(res.data?.mensaje ?? 'Estado actualizado');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.mensaje ??
        'No se pudo actualizar el estado de la venta';
      toast.error(msg);
    },
  });

  function formatDireccion(venta: VentaLote) {
    const direccion = venta.direccion
      ? [
          venta.direccion.calle,
          venta.direccion.piso_depto ? `Piso/Dpto ${venta.direccion.piso_depto}` : undefined,
          venta.direccion.localidad,
          venta.direccion.provincia,
          venta.direccion.codigo_postal ? `CP ${venta.direccion.codigo_postal}` : undefined,
          venta.direccion.pais,
        ]
          .filter(Boolean)
          .join(', ')
      : '';

    return direccion || venta.domicilio_envio || 'Sin dirección cargada';
  }

  async function descargarPdfLote(lote: LoteEnvio) {
    try {
      const res = await api.get(`/lotes-envio/${lote.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lote-${lote.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el PDF del lote');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {lotes.length} lote{lotes.length !== 1 ? 's' : ''} generado{lotes.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => generarLotes.mutate()} disabled={generarLotes.isPending}>
          <PackagePlus className="h-4 w-4" />
          {generarLotes.isPending ? 'Generando...' : 'Generar lotes'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Método de envío</TableHead>
              <TableHead className="text-center">Ventas</TableHead>
              <TableHead>Generado por</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : lotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Aún no se generaron lotes de envío
                </TableCell>
              </TableRow>
            ) : (
              lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-mono text-xs font-semibold">{lote.numero}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(lote.created_at).toLocaleString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lote.metodo_envio.nombre}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{lote.total_ventas}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lote.generador ? `${lote.generador.nombre} ${lote.generador.apellido}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Descargar PDF" onClick={() => descargarPdfLote(lote)}>
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Ver ventas del lote" onClick={() => setLoteDetalle(lote)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!loteDetalle}
        onOpenChange={(open) => {
          if (!open) {
            setLoteDetalle(null);
            setEstadoEdicion({});
            setMotivoEdicion({});
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {loteDetalle ? `Ventas del lote ${loteDetalle.numero}` : 'Ventas del lote'}
            </DialogTitle>
            {loteDetalle && (
              <div className="pt-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => descargarPdfLote(loteDetalle)}>
                  <FileDown className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loteDetalle?.ventas.length ? (
                  loteDetalle.ventas.map((venta) => {
                    const cliente = venta.cliente
                      ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
                      : (venta.guest_nombre ?? 'Invitado');
                    const estadoSeleccionado = estadoEdicion[venta.id] ?? venta.estado;
                    const motivo = motivoEdicion[venta.id] ?? '';
                    const requiereMotivo = estadoSeleccionado === 'en_preparacion';
                    return (
                      <TableRow key={venta.id}>
                        <TableCell className="font-mono text-xs">{venta.numero_pedido}</TableCell>
                        <TableCell>{cliente}</TableCell>
                        <TableCell className="min-w-72 text-sm text-muted-foreground">
                          {formatDireccion(venta)}
                        </TableCell>
                        <TableCell className="min-w-64">
                          <div className="space-y-1">
                            {venta.items.length > 0 ? (
                              venta.items.map((item) => (
                                <div key={item.id} className="text-sm">
                                  <span className="font-medium">{item.producto.nombre}</span>
                                  <span className="text-muted-foreground"> x {item.cantidad}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin productos</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(venta.fecha).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(venta.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Select
                              value={estadoSeleccionado}
                              onValueChange={(value) => {
                                setEstadoEdicion((prev) => ({ ...prev, [venta.id]: value }));
                              }}
                            >
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="despachado">Despachado</SelectItem>
                                <SelectItem value="entregado">Entregado</SelectItem>
                                <SelectItem value="en_preparacion">Volvió a preparación</SelectItem>
                              </SelectContent>
                            </Select>
                            {requiereMotivo && (
                              <Input
                                value={motivo}
                                onChange={(e) => {
                                  setMotivoEdicion((prev) => ({ ...prev, [venta.id]: e.target.value }));
                                }}
                                placeholder="Motivo (obligatorio)"
                                className="w-52 h-8 text-xs"
                              />
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={
                                actualizarEstadoVenta.isPending ||
                                estadoSeleccionado === venta.estado ||
                                !loteDetalle
                              }
                              onClick={() => {
                                if (!loteDetalle) return;
                                if (requiereMotivo && !motivo.trim()) {
                                  toast.error('Debes ingresar el motivo de devolución');
                                  return;
                                }
                                actualizarEstadoVenta.mutate({
                                  loteId: loteDetalle.id,
                                  ventaId: venta.id,
                                  estado: estadoSeleccionado,
                                  motivo: motivo.trim() || undefined,
                                });
                              }}
                            >
                              Guardar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Este lote no tiene ventas asociadas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
