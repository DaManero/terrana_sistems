'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Search,
  User,
  Package,
  ShoppingCart,
  X,
  Check,
  Tag,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

// --- Interfaces locales ---

interface Producto {
  id: number;
  nombre: string;
  imagen_url?: string | null;
  precio_venta_min: string | number;
  precio_venta_may: string | number;
  stock: number;
}

interface ItemForm {
  producto: Producto;
  cantidad: number;
}

interface MetodoEnvio {
  id: number;
  nombre: string;
  costo: string | number;
  gratis_desde?: string | number | null;
  activo: boolean;
}

interface ClienteResultado {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  cel?: string | null;
  aprobado: boolean;
  activo: boolean;
  rol: { id: number; nombre: string };
}

interface CodigoValidado {
  id: number;
  codigo: string;
  tipo: string;
  valor: string | number;
  minimo_compra?: string | number | null;
}

interface Direccion {
  id: number;
  alias?: string | null;
  calle: string;
  piso_depto?: string | null;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  predeterminada: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// --- Helper ---

function inferirTipoCliente(cliente: ClienteResultado): 'minorista' | 'mayorista' {
  return cliente.rol.nombre === 'Cliente Mayorista' ? 'mayorista' : 'minorista';
}

// --- Componente ---

export function DialogNuevaVenta({ open, onClose }: Props) {
  const qc = useQueryClient();

  // Tipo de venta (se elige ANTES de buscar cliente)
  const [tipoCliente, setTipoCliente] = useState<'minorista' | 'mayorista'>('minorista');

  // Cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteResultado | null>(null);
  const [canal, setCanal] = useState<'admin' | 'whatsapp'>('admin');
  const [metodoPago, setMetodoPago] = useState('');

  // Productos
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  // Envio
  const [metodoEnvioId, setMetodoEnvioId] = useState('');
  const [costoEnvioManual, setCostoEnvioManual] = useState('');
  const [direccionId, setDireccionId] = useState('');
  const [domicilioEnvio, setDomicilioEnvio] = useState('');

  // Descuento
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoValidado, setCodigoValidado] = useState<CodigoValidado | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  // Extras
  const [notas, setNotas] = useState('');

  // --- Queries ---

  const { data: resultadosCliente = [], isFetching: buscandoCliente } = useQuery<ClienteResultado[]>({
    queryKey: ['buscar-clientes-venta', busquedaCliente, tipoCliente],
    queryFn: () =>
      api
        .get(`/users?busqueda=${encodeURIComponent(busquedaCliente)}&porPagina=8&tipoCliente=${tipoCliente}`)
        .then((r) => r.data?.data ?? r.data),
    enabled: busquedaCliente.length > 1,
    staleTime: 30000,
  });

  const { data: direccionesCliente = [] } = useQuery<Direccion[]>({
    queryKey: ['direcciones-cliente', clienteSeleccionado?.id],
    queryFn: () =>
      api.get(`/users/${clienteSeleccionado!.id}/direcciones`).then((r) => r.data),
    enabled: !!clienteSeleccionado,
    staleTime: 60000,
  });

  const { data: metodosEnvio = [] } = useQuery<MetodoEnvio[]>({
    queryKey: ['metodos-envio'],
    queryFn: () => api.get('/metodos-envio').then((r) => r.data),
    enabled: open,
  });

  const { data: resultadosProducto = [], isFetching: buscandoProducto } = useQuery<Producto[]>({
    queryKey: ['buscar-productos-nueva-venta', busquedaProducto],
    queryFn: () =>
      api
        .get(`/productos?busqueda=${encodeURIComponent(busquedaProducto)}&porPagina=8&soloActivos=true`)
        .then((r) => r.data?.data ?? []),
    enabled: busquedaProducto.length > 1 && mostrarDropdown,
    staleTime: 30000,
  });

  // --- Calculos ---

  const metodoEnvioSel = metodosEnvio.find((m) => m.id === Number(metodoEnvioId));

  const subtotal = items.reduce((acc, item) => {
    const precio =
      tipoCliente === 'mayorista'
        ? Number(item.producto.precio_venta_may)
        : Number(item.producto.precio_venta_min);
    return acc + precio * item.cantidad;
  }, 0);

  const descuentoMonto = codigoValidado
    ? codigoValidado.tipo === 'porcentaje'
      ? (subtotal * Number(codigoValidado.valor)) / 100
      : Number(codigoValidado.valor)
    : 0;

  const subtotalConDesc = subtotal - descuentoMonto;

  const costoEnvioCalculado = metodoEnvioSel
    ? metodoEnvioSel.gratis_desde != null &&
      subtotalConDesc >= Number(metodoEnvioSel.gratis_desde)
      ? 0
      : Number(metodoEnvioSel.costo)
    : 0;

  const costoEnvio = costoEnvioManual !== '' ? Number(costoEnvioManual) : costoEnvioCalculado;

  const total = subtotalConDesc + costoEnvio;

  const fmt = (n: number) =>
    `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Handlers ---

  function reset() {
    setBusquedaCliente('');
    setClienteSeleccionado(null);
    setTipoCliente('minorista');
    // tipoCliente se resetea arriba
    setCanal('admin');
    setMetodoPago('');
    setBusquedaProducto('');
    setItems([]);
    setMostrarDropdown(false);
    setMetodoEnvioId('');
    setCostoEnvioManual('');
    setDireccionId('');
    setDomicilioEnvio('');
    setCodigoInput('');
    setCodigoValidado(null);
    setNotas('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function seleccionarCliente(c: ClienteResultado) {
    setClienteSeleccionado(c);
    setBusquedaCliente('');
    setDireccionId('');
    setDomicilioEnvio('');
    // Auto-detectar el tipo real del cliente al seleccionarlo
    setTipoCliente(inferirTipoCliente(c));
    setCodigoValidado(null);
    setCodigoInput('');
  }

  function deseleccionarCliente() {
    setClienteSeleccionado(null);
    setDireccionId('');
    setDomicilioEnvio('');
    // No reseteamos tipoCliente: el usuario ya eligió el tipo de venta
    setCodigoValidado(null);
    setCodigoInput('');
  }

  function agregarProducto(producto: Producto) {
    setBusquedaProducto('');
    setMostrarDropdown(false);
    const existe = items.find((i) => i.producto.id === producto.id);
    if (existe) {
      setItems(items.map((i) => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setItems([...items, { producto, cantidad: 1 }]);
    }
  }

  function setCantidad(productoId: number, cantidad: number) {
    if (cantidad < 1) return;
    const item = items.find((i) => i.producto.id === productoId);
    if (item && cantidad > item.producto.stock) {
      toast.error(`Stock disponible: ${item.producto.stock}`);
      return;
    }
    setItems(items.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i)));
  }

  function quitarProducto(productoId: number) {
    setItems(items.filter((i) => i.producto.id !== productoId));
  }

  async function validarCodigo() {
    if (!codigoInput.trim()) return;
    setValidandoCodigo(true);
    try {
      const res = await api.post('/codigos-descuento/validar', {
        codigo: codigoInput.trim(),
        subtotal,
        tipo_cliente: tipoCliente,
      });
      setCodigoValidado(res.data);
      toast.success(`Codigo ${res.data.codigo} aplicado`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Codigo invalido o vencido');
      setCodigoValidado(null);
    } finally {
      setValidandoCodigo(false);
    }
  }

  // --- Mutation ---

  const crearVenta = useMutation({
    mutationFn: () => {
      if (costoEnvioManual !== '') {
        const costoManual = Number(costoEnvioManual);
        if (Number.isNaN(costoManual) || costoManual < 0) {
          throw new Error('Costo de envio invalido');
        }
      }

      let usuarioId: number | undefined;
      if (typeof window !== 'undefined') {
        try {
          const u = JSON.parse(localStorage.getItem('terrana_admin_user') ?? '{}');
          usuarioId = u.id;
        } catch { /* ignore */ }
      }

      const body: Record<string, unknown> = {
        cliente_id: clienteSeleccionado!.id,
        tipo_cliente: tipoCliente,
        canal,
        items: items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
        metodo_envio_id: Number(metodoEnvioId),
        ...(notas && { notas }),
        ...(metodoPago && { metodo_pago: metodoPago }),
        ...(direccionId
          ? { direccion_id: Number(direccionId) }
          : domicilioEnvio
          ? { domicilio_envio: domicilioEnvio }
          : {}),
        ...(codigoValidado && { codigo_descuento_id: codigoValidado.id }),
        ...(costoEnvioManual !== '' && { costo_envio_manual: Number(costoEnvioManual) }),
        ...(usuarioId && { creado_por: usuarioId }),
      };

      return api.post('/ventas', body);
    },
    onSuccess: () => {
      toast.success('Venta creada correctamente');
      qc.invalidateQueries({ queryKey: ['ventas'] });
      handleClose();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? (e instanceof Error ? e.message : 'Error al crear la venta'));
    },
  });

  const puedeCrear = !!clienteSeleccionado && items.length > 0 && !!metodoEnvioId;

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-230 max-w-[97vw] max-h-[95vh] overflow-hidden flex flex-col p-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Nueva venta manual</DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          <div className="grid grid-cols-5 w-full min-h-0">

            {/* Columna izquierda */}
            <div className="col-span-3 overflow-y-auto px-6 py-5 space-y-6 border-r">

              {/* 0. Tipo de venta */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Tipo de venta
                </Label>
                <div className="flex rounded-md border overflow-hidden text-sm w-fit">
                  {(['minorista', 'mayorista'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (tipoCliente !== t) {
                          setTipoCliente(t);
                          setClienteSeleccionado(null);
                          setBusquedaCliente('');
                          setCodigoValidado(null);
                          setCodigoInput('');
                        }
                      }}
                      className={`px-4 py-1.5 capitalize transition-colors font-medium ${
                        tipoCliente === t
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {t === 'mayorista' ? 'Mayorista' : 'Minorista'}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 1. Cliente */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Cliente
                </Label>

                {clienteSeleccionado ? (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant={tipoCliente === 'mayorista' ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {tipoCliente === 'mayorista' ? 'Mayorista' : 'Minorista'}
                            </Badge>
                            {clienteSeleccionado.aprobado && (
                              <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                                <ShieldCheck className="w-3 h-3" /> Aprobado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={deseleccionarCliente}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{clienteSeleccionado.email}</span>
                      </span>
                      {clienteSeleccionado.cel && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          {clienteSeleccionado.cel}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/70">
                        Rol: {clienteSeleccionado.rol.nombre}
                      </span>
                    </div>

                    <div className="pt-1 border-t flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Precio a aplicar:</span>
                      <div className="flex rounded-md border overflow-hidden text-xs">
                        {(['minorista', 'mayorista'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { setTipoCliente(t); setCodigoValidado(null); setCodigoInput(''); }}
                            className={`px-3 py-1 capitalize transition-colors ${tipoCliente === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente por nombre o email..."
                      className="pl-8"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                    />
                    {busquedaCliente.length > 1 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-popover border rounded-md shadow-lg overflow-hidden">
                        {buscandoCliente ? (
                          <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                        ) : resultadosCliente.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
                        ) : (
                          resultadosCliente.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center gap-3"
                              onClick={() => seleccionarCliente(c)}
                            >
                              <User className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {c.nombre} {c.apellido}
                                  <span className="ml-1.5 text-[10px] text-green-600 font-normal">{c.rol.nombre}</span>
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                              </div>
                              {c.cel && (
                                <span className="text-xs text-muted-foreground shrink-0">{c.cel}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* 2. Canal y metodo de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Canal</Label>
                  <Select value={canal} onValueChange={(v) => setCanal(v as 'admin' | 'whatsapp')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Metodo de pago</Label>
                  <Select value={metodoPago || '_none'} onValueChange={(v) => setMetodoPago(v === '_none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No especificado</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* 3. Productos */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Productos
                </Label>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto para agregar..."
                    className="pl-8"
                    value={busquedaProducto}
                    onChange={(e) => { setBusquedaProducto(e.target.value); setMostrarDropdown(true); }}
                    onFocus={() => setMostrarDropdown(true)}
                    onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                  />
                  {mostrarDropdown && busquedaProducto.length > 1 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-popover border rounded-md shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                      {buscandoProducto ? (
                        <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                      ) : resultadosProducto.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
                      ) : (
                        resultadosProducto.map((p) => {
                          const precio = tipoCliente === 'mayorista' ? p.precio_venta_may : p.precio_venta_min;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center gap-3"
                              onMouseDown={() => agregarProducto(p)}
                            >
                              {p.imagen_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imagen_url} alt={p.nombre} className="w-8 h-8 rounded object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted shrink-0 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {'Stock: ' + p.stock + ' - $' + Number(precio).toLocaleString('es-AR')}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                    Busca y agrega productos a la venta
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const precio = tipoCliente === 'mayorista'
                        ? Number(item.producto.precio_venta_may)
                        : Number(item.producto.precio_venta_min);
                      return (
                        <div key={item.producto.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                          {item.producto.imagen_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.producto.imagen_url} alt={item.producto.nombre} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted shrink-0" />
                          )}
                          <p className="text-sm font-medium flex-1 truncate">{item.producto.nombre}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(item.producto.id, item.cantidad - 1)} disabled={item.cantidad === 1}>-</Button>
                            <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(item.producto.id, item.cantidad + 1)}>+</Button>
                          </div>
                          <span className="text-sm font-semibold w-24 text-right shrink-0">{fmt(precio * item.cantidad)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => quitarProducto(item.producto.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col-span-2 overflow-y-auto px-5 py-5 space-y-5 bg-muted/20">

              {/* Resumen */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5" /> Resumen
                </Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  {descuentoMonto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento{codigoValidado ? ` (${codigoValidado.codigo})` : ''}</span>
                      <span>- {fmt(descuentoMonto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envio</span>
                    <span>{metodoEnvioId ? costoEnvio === 0 ? 'Gratis' : fmt(costoEnvio) : '-'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{fmt(total)}</span>
                  </div>
                  {items.length > 0 && (
                    <p className="text-[11px] text-muted-foreground capitalize">
                      Precios {tipoCliente}s
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Envio */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Envio *
                </Label>
                <Select value={metodoEnvioId} onValueChange={(value) => {
                  setMetodoEnvioId(value);
                  setCostoEnvioManual('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosEnvio.filter((m) => m.activo).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nombre}{' '}
                        {Number(m.costo) === 0 ? '(Gratis)' : '($' + Number(m.costo).toLocaleString('es-AR') + ')'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {metodoEnvioId && (
                  <div className="space-y-1">
                    <Label className="text-xs">Costo de envio manual ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={String(costoEnvioCalculado)}
                      value={costoEnvioManual}
                      onChange={(e) => setCostoEnvioManual(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dejalo vacio para usar el costo automatico del metodo.
                    </p>
                  </div>
                )}

                {metodoEnvioId && (
                  clienteSeleccionado && direccionesCliente.length > 0 ? (
                    <div className="space-y-2">
                      <Select
                        value={direccionId || '_otra'}
                        onValueChange={(v) => { setDireccionId(v === '_otra' ? '' : v); setDomicilioEnvio(''); }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Selecciona una direccion" />
                        </SelectTrigger>
                        <SelectContent>
                          {direccionesCliente.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.alias ? d.alias + ': ' : ''}{d.calle}{d.piso_depto ? ', ' + d.piso_depto : ''}, {d.localidad}{d.predeterminada ? ' *' : ''}
                            </SelectItem>
                          ))}
                          <SelectItem value="_otra">Otra direccion...</SelectItem>
                        </SelectContent>
                      </Select>
                      {!direccionId && (
                        <Input
                          placeholder="Ingresa la direccion"
                          value={domicilioEnvio}
                          onChange={(e) => setDomicilioEnvio(e.target.value)}
                          className="text-sm"
                        />
                      )}
                    </div>
                  ) : (
                    <Input
                      placeholder={clienteSeleccionado ? 'Sin direcciones guardadas - ingresa una' : 'Direccion de entrega (opcional)'}
                      value={domicilioEnvio}
                      onChange={(e) => setDomicilioEnvio(e.target.value)}
                      className="text-sm"
                    />
                  )
                )}

                {metodoEnvioSel?.gratis_desde != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Envio gratis desde {fmt(Number(metodoEnvioSel.gratis_desde))}
                  </p>
                )}
              </div>

              <Separator />

              {/* Descuento */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Codigo de descuento
                </Label>
                {codigoValidado ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800">{codigoValidado.codigo}</p>
                      <p className="text-xs text-green-600">
                        {codigoValidado.tipo === 'porcentaje'
                          ? codigoValidado.valor + '% de descuento'
                          : fmt(Number(codigoValidado.valor)) + ' de descuento'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCodigoValidado(null); setCodigoInput(''); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="CODIGO"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && validarCodigo()}
                      className="uppercase text-sm"
                      disabled={items.length === 0}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={validarCodigo}
                      disabled={!codigoInput.trim() || validandoCodigo || items.length === 0}
                    >
                      {validandoCodigo ? '...' : 'Aplicar'}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Notas */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Notas internas
                </Label>
                <Textarea
                  placeholder="Observaciones, referencias, aclaraciones..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-4 shrink-0 bg-background">
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'producto' : 'productos'} - {fmt(total)}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={crearVenta.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => crearVenta.mutate()} disabled={!puedeCrear || crearVenta.isPending}>
              {crearVenta.isPending ? 'Creando...' : 'Crear venta'}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
