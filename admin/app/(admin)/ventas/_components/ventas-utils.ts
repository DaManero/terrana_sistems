// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoVenta =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'despachado'
  | 'entregado'
  | 'cancelado';

export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado';

export type CanalVenta = 'ecommerce' | 'admin' | 'whatsapp';

// ─── Labels ───────────────────────────────────────────────────────────────────

export const ESTADO_LABELS: Record<EstadoVenta, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const PAGO_LABELS: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  reembolsado: 'Reembolsado',
};

export const CANAL_LABELS: Record<CanalVenta, string> = {
  ecommerce: 'Ecommerce',
  admin: 'Admin',
  whatsapp: 'WhatsApp',
};

export interface MetodoPagoOption {
  value: string;
  label: string;
}

export const METODOS_PAGO_OPTIONS: MetodoPagoOption[] = [
  { value: 'En Destino', label: 'En Destino' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
  // Compatibilidad con ventas historicas que guardaron un valor genérico.
  { value: 'tarjeta', label: 'Tarjeta' },
];

// ─── Estilos ──────────────────────────────────────────────────────────────────

/** Clases Tailwind para el badge de estado (inline span con border) */
export function estadoClase(estado: string): string {
  const map: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmado: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    en_preparacion: 'bg-orange-100 text-orange-800 border-orange-200',
    despachado: 'bg-purple-100 text-purple-800 border-purple-200',
    entregado: 'bg-green-100 text-green-800 border-green-200',
    cancelado: 'bg-red-100 text-red-800 border-red-200',
  };
  return map[estado] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

/** Variant para el Badge de pago */
export function pagoVariant(
  estado: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (estado === 'aprobado') return 'secondary';
  if (estado === 'rechazado') return 'destructive';
  return 'outline';
}

// ─── Flujo de estados ─────────────────────────────────────────────────────────

/** Transiciones válidas desde cada estado */
export const SIGUIENTE_ESTADO: Record<EstadoVenta, EstadoVenta[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['despachado', 'cancelado'],
  despachado: ['entregado'],
  entregado: [],
  cancelado: [],
};

/** Pasos del flujo principal (sin cancelado) para el timeline */
export const FLUJO_ESTADOS: EstadoVenta[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'despachado',
  'entregado',
];

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonto(n: number | string): string {
  return `$${Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Interfaces compartidas ───────────────────────────────────────────────────

export interface VentaItem {
  id: number;
  cantidad: number;
  precio_unitario: string | number;
  subtotal: string | number;
  producto: {
    id: number;
    nombre: string;
    imagen_url?: string | null;
  };
}

export interface DireccionVenta {
  id: number;
  calle?: string;
  piso_depto?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
  pais?: string;
}

export interface VentaDetalle {
  id: number;
  numero_pedido: string;
  cliente?: { id: number; nombre: string; apellido: string; email: string; cel?: string };
  guest_nombre?: string;
  guest_email?: string;
  guest_telefono?: string;
  fecha: string;
  estado: EstadoVenta;
  canal: string;
  tipo_cliente: string;
  subtotal: string | number;
  descuento: string | number;
  costo_envio: string | number;
  total: string | number;
  metodo_pago?: string;
  pago_estado: EstadoPago;
  mp_payment_id?: string;
  metodo_envio?: { id?: number; nombre: string };
  direccion?: DireccionVenta | null;
  domicilio_envio?: string;
  codigo_descuento?: { codigo: string } | null;
  notas?: string;
  items: VentaItem[];
  created_at: string;
}

export interface VentaListItem {
  id: number;
  numero_pedido: string;
  cliente?: { id: number; nombre: string; apellido: string; email: string };
  guest_nombre?: string;
  guest_email?: string;
  fecha: string;
  estado: EstadoVenta;
  canal: string;
  tipo_cliente: string;
  total: string | number;
  pago_estado: EstadoPago;
  items: { id: number }[];
  created_at: string;
}
