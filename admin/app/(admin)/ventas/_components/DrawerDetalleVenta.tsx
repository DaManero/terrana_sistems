'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { User, MapPin, Package, CreditCard, FileText, Check, Pencil } from 'lucide-react';
import {
  type VentaDetalle,
  type EstadoVenta,
  ESTADO_LABELS,
  PAGO_LABELS,
  CANAL_LABELS,
  SIGUIENTE_ESTADO,
  FLUJO_ESTADOS,
  estadoClase,
  pagoVariant,
  formatFecha,
  formatMonto,
} from './ventas-utils';
import { DialogEditarVenta } from './DialogEditarVenta';

interface Props {
  ventaId: number | null;
  open: boolean;
  onClose: () => void;
  editarAlAbrir?: boolean;
}

export function DrawerDetalleVenta({ ventaId, open, onClose, editarAlAbrir = false }: Props) {
  const qc = useQueryClient();
  const [editarOpen, setEditarOpen] = useState(false);

  const {
    data: venta,
    isLoading,
    isError,
  } = useQuery<VentaDetalle>({
    queryKey: ['venta', ventaId],
    queryFn: () => api.get(`/ventas/${ventaId}`).then((r) => r.data),
    enabled: !!ventaId && open,
    staleTime: 0,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.patch(`/ventas/${id}/estado`, { estado }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['venta', ventaId] });
      qc.invalidateQueries({ queryKey: ['ventas'] });
    },
    onError: () => toast.error('Error al actualizar el estado'),
  });

  const nombreCliente = venta
    ? venta.cliente
      ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
      : (venta.guest_nombre ?? 'Invitado')
    : '';

  const emailCliente = venta?.cliente?.email ?? venta?.guest_email ?? '—';
  const telCliente = venta?.cliente?.cel ?? venta?.guest_telefono ?? '—';

  const siguientes: EstadoVenta[] = venta ? (SIGUIENTE_ESTADO[venta.estado] ?? []) : [];

  const domicilioGuardado = venta?.domicilio_envio?.trim() || null;

  const direccionPartes = venta?.direccion
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
    : null;

  const domicilio =
    [direccionPartes, domicilioGuardado]
      .filter(Boolean)
      .join(' | ') || null;

  useEffect(() => {
    if (!open) {
      setEditarOpen(false);
      return;
    }

    if (editarAlAbrir && venta) {
      setEditarOpen(true);
    }
  }, [editarAlAbrir, open, venta]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0">
        <SheetTitle className="sr-only">Detalle de venta</SheetTitle>
        {isLoading ? (
          <div className="p-8 space-y-4 pt-12">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : isError || !venta ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No se pudo cargar el pedido.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="px-6 pt-8 pb-4 border-b bg-muted/30 shrink-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Pedido</p>
                  <h2 className="text-xl font-bold font-mono tracking-tight">
                    {venta.numero_pedido}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatFecha(venta.fecha)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditarOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${estadoClase(venta.estado)}`}
                  >
                    {ESTADO_LABELS[venta.estado] ?? venta.estado}
                  </span>
                  <Badge variant={pagoVariant(venta.pago_estado)} className="text-xs">
                    {PAGO_LABELS[venta.pago_estado] ?? venta.pago_estado}
                  </Badge>
                </div>
              </div>

              {/* Timeline */}
              {venta.estado !== 'cancelado' ? (
                <div className="flex items-center overflow-x-auto pb-1">
                  {FLUJO_ESTADOS.map((e, i) => {
                    const idxActual = FLUJO_ESTADOS.indexOf(venta.estado);
                    const completado = i < idxActual;
                    const activo = e === venta.estado;
                    return (
                      <div key={e} className="flex items-center">
                        <div className="flex flex-col items-center min-w-17">
                          <div
                            className={[
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                              completado
                                ? 'bg-green-500 border-green-500 text-white'
                                : activo
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 text-muted-foreground/50',
                            ].join(' ')}
                          >
                            {completado ? <Check className="w-3 h-3" /> : i + 1}
                          </div>
                          <span
                            className={`text-[10px] text-center leading-tight mt-1 ${
                              activo
                                ? 'font-semibold text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {ESTADO_LABELS[e]}
                          </span>
                        </div>
                        {i < FLUJO_ESTADOS.length - 1 && (
                          <div
                            className={`h-0.5 w-5 mx-0.5 mb-4 shrink-0 ${
                              completado ? 'bg-green-500' : 'bg-muted-foreground/20'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <div className="h-0.5 flex-1 bg-destructive/30 rounded" />
                  <span className="text-xs font-semibold text-destructive px-2">
                    Venta cancelada
                  </span>
                  <div className="h-0.5 flex-1 bg-destructive/30 rounded" />
                </div>
              )}
            </div>

            {/* ── Cuerpo scrollable ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* Cliente */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Nombre</p>
                      <p className="font-medium">{nombreCliente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Tipo</p>
                      <p className="font-medium capitalize">{venta.tipo_cliente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <p className="font-medium break-all">{emailCliente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Teléfono</p>
                      <p className="font-medium">{telCliente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Canal</p>
                      <p className="font-medium">
                        {CANAL_LABELS[venta.canal as keyof typeof CANAL_LABELS] ?? venta.canal}
                      </p>
                    </div>
                    {venta.metodo_pago && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Método de pago</p>
                        <p className="font-medium capitalize">{venta.metodo_pago}</p>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Productos */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" />
                    Productos ({venta.items.length})
                  </h3>
                  <div className="space-y-2">
                    {venta.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2"
                      >
                        {item.producto.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.producto.imagen_url}
                            alt={item.producto.nombre}
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMonto(item.precio_unitario)} × {item.cantidad}
                          </p>
                        </div>
                        <p className="text-sm font-semibold shrink-0">
                          {formatMonto(item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />

                {/* Totales */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" />
                    Resumen financiero
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatMonto(venta.subtotal)}</span>
                    </div>
                    {Number(venta.descuento) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Descuento{' '}
                          {venta.codigo_descuento ? `(${venta.codigo_descuento.codigo})` : ''}
                        </span>
                        <span>− {formatMonto(venta.descuento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <span>
                        {Number(venta.costo_envio) === 0
                          ? 'Gratis'
                          : formatMonto(venta.costo_envio)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total</span>
                      <span>{formatMonto(venta.total)}</span>
                    </div>
                  </div>
                </section>

                {/* Envío */}
                {(venta.metodo_envio || domicilio) && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Envío
                      </h3>
                      <div className="space-y-1.5 text-sm">
                        {venta.metodo_envio && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Método:</span>
                            <span className="font-medium">{venta.metodo_envio.nombre}</span>
                          </div>
                        )}
                        {domicilio && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground shrink-0">Dirección:</span>
                            <span className="font-medium">{domicilio}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {/* Notas */}
                {venta.notas && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Notas
                      </h3>
                      <p className="text-sm bg-muted rounded-lg p-3">{venta.notas}</p>
                    </section>
                  </>
                )}
              </div>
            </div>

            {/* ── Footer: cambiar estado ───────────────────────────────── */}
            {siguientes.length > 0 && (
              <div className="border-t px-6 py-4 bg-background shrink-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Cambiar estado
                </p>
                <div className="flex flex-wrap gap-2">
                  {siguientes.map((sig) => (
                    <Button
                      key={sig}
                      variant={sig === 'cancelado' ? 'destructive' : 'default'}
                      size="sm"
                      disabled={cambiarEstado.isPending}
                      onClick={() => cambiarEstado.mutate({ id: venta.id, estado: sig })}
                    >
                      {sig === 'cancelado'
                        ? 'Cancelar venta'
                        : `Marcar como ${ESTADO_LABELS[sig]}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>

      {/* Dialog de edición (se monta sobre el drawer) */}
      {venta && (
        <DialogEditarVenta
          venta={venta}
          open={editarOpen}
          onClose={() => setEditarOpen(false)}
        />
      )}
    </Sheet>
  );
}
