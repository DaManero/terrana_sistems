// ─────────────────────────────────────────────────────────────────────────────
//  Terrana — Tipos e interfaces TypeScript compartidos del backend
// ─────────────────────────────────────────────────────────────────────────────

// ─── Roles del sistema ────────────────────────────────────────────────────────

export type RolNombre =
  | 'Admin'
  | 'Operador'
  | 'Cliente Mayorista'
  | 'Cliente Minorista';

// ─── Tipos de cliente (en ventas) ─────────────────────────────────────────────

export type TipoCliente = 'minorista' | 'mayorista';

// ─── Estado de venta ──────────────────────────────────────────────────────────

export type EstadoVenta =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'despachado'
  | 'entregado'
  | 'cancelado';

export type EstadoPago =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'reembolsado';

// ─── Stock ────────────────────────────────────────────────────────────────────

export type TipoMovimientoStock =
  | 'venta'
  | 'devolucion'
  | 'ajuste_manual'
  | 'ingreso_compra'
  | 'merma'
  | 'inicial';

// ─── Tokens de contraseña ─────────────────────────────────────────────────────

export type TipoToken = 'set_password' | 'reset_password';

// ─── Estado de solicitud mayorista ────────────────────────────────────────────

export type EstadoSolicitudMayorista = 'pendiente' | 'aprobada' | 'rechazada';

// ─── Descuentos ───────────────────────────────────────────────────────────────

export type TipoDescuento = 'porcentaje' | 'monto_fijo';
export type AplicaADescuento = 'todos' | 'minoristas' | 'mayoristas';

// ─── Canales de venta ─────────────────────────────────────────────────────────

export type CanalVenta = 'ecommerce' | 'admin' | 'whatsapp';

// ─── Respuesta paginada ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

// ─── Filtros de productos ─────────────────────────────────────────────────────

export interface FiltrosProducto {
  categoriaId?: number;
  subcategoriaId?: number;
  marcaId?: number;
  presentacionId?: number;
  origenId?: number;
  busqueda?: string;
  soloConStock?: boolean;
  soloActivos?: boolean;
  pagina?: number;
  porPagina?: number;
  ordenar?: 'precio_asc' | 'precio_desc' | 'nombre_asc' | 'nombre_desc' | 'nuevo';
}

// ─── Filtros de ventas ────────────────────────────────────────────────────────

export interface FiltrosVenta {
  estado?: EstadoVenta;
  pagoEstado?: EstadoPago;
  clienteId?: number;
  canal?: CanalVenta;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: number;
}
