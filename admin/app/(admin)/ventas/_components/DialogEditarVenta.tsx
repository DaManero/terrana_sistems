'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Search, Package, Plus, Minus } from 'lucide-react';
import {
  type VentaDetalle,
  type EstadoVenta,
  type EstadoPago,
  ESTADO_LABELS,
  PAGO_LABELS,
  formatMonto,
} from './ventas-utils';

// ─── Interfaces locales ──────────────────────────────────────────────────────

interface Producto {
  id: number;
  nombre: string;
  imagen_url?: string | null;
  precio_venta_min: string | number;
  precio_venta_may: string | number;
  stock: number;
}

interface ItemEdit {
  producto_id: number;
  nombre: string;
  imagen_url?: string | null;
  cantidad: number;
  precio_unitario: number;
}

interface Props {
  venta: VentaDetalle;
  open: boolean;
  onClose: () => void;
}

const ESTADOS_VENTA = Object.entries(ESTADO_LABELS) as [EstadoVenta, string][];
const ESTADOS_PAGO = Object.entries(PAGO_LABELS) as [EstadoPago, string][];

const METODOS_PAGO = [
  { value: '', label: '— Sin especificar —' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function DialogEditarVenta({ venta, open, onClose }: Props) {
  const qc = useQueryClient();

  // Estados
  const [estado, setEstado] = useState<EstadoVenta>(venta.estado);
  const [pagoEstado, setPagoEstado] = useState<EstadoPago>(venta.pago_estado);
  const [metodoPago, setMetodoPago] = useState(venta.metodo_pago ?? '');
  const [notas, setNotas] = useState(venta.notas ?? '');

  // Items
  const [items, setItems] = useState<ItemEdit[]>([]);

  // Búsqueda de productos
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  // Inicializar items al abrir
  useEffect(() => {
    if (open) {
      setEstado(venta.estado);
      setPagoEstado(venta.pago_estado);
      setMetodoPago(venta.metodo_pago ?? '');
      setNotas(venta.notas ?? '');
      setItems(
        venta.items.map((item) => ({
          producto_id: item.producto.id,
          nombre: item.producto.nombre,
          imagen_url: item.producto.imagen_url,
          cantidad: item.cantidad,
          precio_unitario: Number(item.precio_unitario),
        }))
      );
      setBusqueda('');
      setMostrarDropdown(false);
    }
  }, [open, venta]);

  // Búsqueda de productos
  const { data: resultadosProducto = [], isFetching: buscando } = useQuery<Producto[]>({
    queryKey: ['buscar-productos-editar-venta', busqueda],
    queryFn: () =>
      api
        .get(`/productos?busqueda=${encodeURIComponent(busqueda)}&porPagina=8&soloActivos=true`)
        .then((r) => r.data?.data ?? []),
    enabled: busqueda.length > 1 && mostrarDropdown,
    staleTime: 30000,
  });

  // ─── Cálculos ────────────────────────────────────────────────────────────────

  const subtotalNuevo = items.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
  const descuento = Number(venta.descuento);
  const costoEnvio = Number(venta.costo_envio);
  const totalNuevo = Math.max(0, subtotalNuevo - descuento + costoEnvio);

  // ─── Handlers de items ───────────────────────────────────────────────────────

  function agregarProducto(prod: Producto) {
    setBusqueda('');
    setMostrarDropdown(false);
    const existe = items.find((i) => i.producto_id === prod.id);
    if (existe) {
      setItems(
        items.map((i) =>
          i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          imagen_url: prod.imagen_url,
          cantidad: 1,
          precio_unitario:
            venta.tipo_cliente === 'mayorista'
              ? Number(prod.precio_venta_may)
              : Number(prod.precio_venta_min),
        },
      ]);
    }
  }

  function setCantidad(producto_id: number, cantidad: number) {
    if (cantidad < 1) return;
    setItems(items.map((i) => (i.producto_id === producto_id ? { ...i, cantidad } : i)));
  }

  function quitarItem(producto_id: number) {
    setItems(items.filter((i) => i.producto_id !== producto_id));
  }

  // ─── Mutación ────────────────────────────────────────────────────────────────

  const editar = useMutation({
    mutationFn: () => {
      if (items.length === 0) throw new Error('La venta debe tener al menos un producto');
      return api.put(`/ventas/${venta.id}`, {
        estado,
        pago_estado: pagoEstado,
        metodo_pago: metodoPago || null,
        notas: notas.trim() || null,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
      });
    },
    onSuccess: () => {
      toast.success('Venta actualizada');
      qc.invalidateQueries({ queryKey: ['venta', venta.id] });
      qc.invalidateQueries({ queryKey: ['ventas'] });
      onClose();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? (e instanceof Error ? e.message : 'Error al guardar'));
    },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-225 max-w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle>
            Editar venta <span className="font-mono text-primary">{venta.numero_pedido}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-0 min-h-0">

            {/* ── Columna izquierda: Estados y pago ───────────────────── */}
            <div className="px-6 py-5 space-y-5 border-r">

              {/* Estado de la venta */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Estado de la venta
                </Label>
                <Select value={estado} onValueChange={(v) => setEstado(v as EstadoVenta)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_VENTA.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Estado de pago */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Estado de pago
                </Label>
                <Select value={pagoEstado} onValueChange={(v) => setPagoEstado(v as EstadoPago)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PAGO.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Método de pago */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Método de pago
                </Label>
                <Select
                  value={metodoPago || '__none__'}
                  onValueChange={(v) => setMetodoPago(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin especificar —</SelectItem>
                    {METODOS_PAGO.filter((m) => m.value !== '').map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Notas */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Notas internas
                </Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones o aclaraciones..."
                  className="resize-none text-sm"
                  rows={4}
                />
              </div>

              {/* Resumen financiero */}
              <Separator />
              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Resumen
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMonto(subtotalNuevo)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>− {formatMonto(descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{costoEnvio === 0 ? 'Gratis' : formatMonto(costoEnvio)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatMonto(totalNuevo)}</span>
                </div>
              </div>
            </div>

            {/* ── Columna derecha: Productos ───────────────────────────── */}
            <div className="px-6 py-5 space-y-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Productos ({items.length})
              </Label>

              {/* Buscador de productos */}
              <div className="relative">
                <div className="flex items-center border rounded-md px-3 gap-2 bg-background focus-within:ring-2 focus-within:ring-ring">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setMostrarDropdown(e.target.value.length > 1);
                    }}
                    onFocus={() => { if (busqueda.length > 1) setMostrarDropdown(true); }}
                    onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
                    placeholder="Agregar producto..."
                    className="border-0 p-0 h-9 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>

                {mostrarDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {buscando ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">Buscando...</p>
                    ) : resultadosProducto.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">Sin resultados</p>
                    ) : (
                      resultadosProducto.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onMouseDown={() => agregarProducto(prod)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          {prod.imagen_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prod.imagen_url} alt={prod.nombre} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted shrink-0 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{prod.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {prod.stock} ·{' '}
                              {formatMonto(
                                venta.tipo_cliente === 'mayorista'
                                  ? Number(prod.precio_venta_may)
                                  : Number(prod.precio_venta_min)
                              )}
                            </p>
                          </div>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lista de items */}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Package className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Sin productos</p>
                  <p className="text-xs mt-0.5">Buscá un producto para agregar</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-105 overflow-y-auto pr-0.5">
                  {items.map((item) => (
                    <div
                      key={item.producto_id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      {item.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imagen_url}
                          alt={item.nombre}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMonto(item.precio_unitario)} c/u
                        </p>
                      </div>

                      {/* Cantidad */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setCantidad(item.producto_id, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-medium tabular-nums">
                          {item.cantidad}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setCantidad(item.producto_id, item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <p className="text-sm font-semibold w-20 text-right shrink-0">
                        {formatMonto(item.precio_unitario * item.cantidad)}
                      </p>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => quitarItem(item.producto_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={editar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => editar.mutate()}
            disabled={editar.isPending || items.length === 0}
          >
            {editar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
