'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Eye, ImageOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface Producto {
  id: number;
  nombre: string;
  activo: boolean;
  stock: number;
  precio_venta_min: string;
  precio_venta_may: string;
  precio_promo?: string;
  costo?: string;
  descripcion?: string;
  uso_recomendado?: string;
  imagen_url?: string;
  categoria_id: number;
  subcategoria_id?: number;
  marca_id?: number;
  presentacion_id?: number;
  origen_id?: number;
  proveedor_id?: number;
  created_at?: string;
  categoria?: { id: number; nombre: string };
  subcategoria?: { id: number; nombre: string };
  marca?: { id: number; nombre: string };
  presentacion?: { id: number; nombre: string };
  origen?: { id: number; nombre: string };
  proveedor?: { id: number; nombre: string };
}

interface FormData {
  nombre: string;
  descripcion: string;
  uso_recomendado: string;
  categoria_id: string;
  subcategoria_id: string;
  marca_id: string;
  presentacion_id: string;
  origen_id: string;
  proveedor_id: string;
  precio_venta_min: string;
  precio_venta_may: string;
  precio_promo: string;
  costo: string;
  stock: string;
  imagen_url: string;
}

const EMPTY_FORM: FormData = {
  nombre: '', descripcion: '', uso_recomendado: '', categoria_id: '', subcategoria_id: '',
  marca_id: '', presentacion_id: '', origen_id: '', proveedor_id: '',
  precio_venta_min: '', precio_venta_may: '', precio_promo: '', costo: '',
  stock: '0', imagen_url: '',
};

function convertirUrlImagen(url?: string): string {
  if (!url) return '';
  // Convierte enlace de compartir de Google Drive al formato de thumbnail embebible
  // https://drive.google.com/file/d/FILE_ID/view?... → https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  return url;
}

function ImagePreview({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  const [error, setError] = useState(false);
  const srcConvertido = convertirUrlImagen(src);

  useEffect(() => { setError(false); }, [srcConvertido]);

  if (!srcConvertido || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground gap-1 ${className}`}>
        <ImageOff className="h-8 w-8 opacity-40" />
        <span className="text-xs opacity-60">Sin imagen</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={srcConvertido}
      alt={alt ?? 'imagen producto'}
      className={`object-cover rounded-md ${className}`}
      onError={() => setError(true)}
    />
  );
}

export function TabProductos() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [categFilter, setCategFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({ defaultValues: EMPTY_FORM });

  const categoriaId = watch('categoria_id');
  const imagenUrl = watch('imagen_url');

  async function subirImagen(file: File) {
    setSubiendoImagen(true);
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      const res = await api.post('/uploads/imagen', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('imagen_url', res.data.url, { shouldDirty: true });
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  }

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias').then(r => r.data) });
  const { data: subcategorias = [] } = useQuery({
    queryKey: ['subcategorias', categoriaId],
    queryFn: () => api.get('/categorias').then(r => r.data),
    enabled: !!categoriaId,
    select: (data: { id: number; nombre: string; subcategorias: { id: number; nombre: string }[] }[]) =>
      data.find((c: { id: number }) => c.id === Number(categoriaId))?.subcategorias ?? [],
  });
  const { data: marcas = [] } = useQuery({ queryKey: ['marcas'], queryFn: () => api.get('/marcas').then(r => r.data) });
  const { data: presentaciones = [] } = useQuery({ queryKey: ['presentaciones'], queryFn: () => api.get('/presentaciones').then(r => r.data) });
  const { data: origenes = [] } = useQuery({ queryKey: ['origenes'], queryFn: () => api.get('/origenes').then(r => r.data) });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: () => api.get('/proveedores').then(r => r.data) });

  const params = new URLSearchParams({ pagina: String(pagina), porPagina: '15', soloActivos: 'false' });
  if (busqueda)    params.set('busqueda', busqueda);
  if (categFilter) params.set('categoriaId', categFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['productos', pagina, busqueda, categFilter],
    queryFn: () => api.get(`/productos?${params}`).then(r => r.data),
  });

  const productos: Producto[] = data?.data ?? [];
  const totalPaginas: number = data?.totalPaginas ?? 1;

  const crear = useMutation({
    mutationFn: (body: object) => api.post('/productos', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Producto creado'); cerrarDialog(); },
    onError: () => toast.error('Error al crear producto'),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/productos/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Producto actualizado'); cerrarDialog(); },
    onError: () => toast.error('Error al actualizar producto'),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.patch(`/productos/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Estado actualizado'); },
  });

  function abrirCrear() { setEditando(null); reset(EMPTY_FORM); setDialogOpen(true); }

  function abrirEditar(p: Producto) {
    setEditando(p);
    reset({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      uso_recomendado: p.uso_recomendado ?? '',
      categoria_id: String(p.categoria_id),
      subcategoria_id: p.subcategoria_id ? String(p.subcategoria_id) : '',
      marca_id: p.marca_id ? String(p.marca_id) : '',
      presentacion_id: p.presentacion_id ? String(p.presentacion_id) : '',
      origen_id: p.origen_id ? String(p.origen_id) : '',
      proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '',
      precio_venta_min: String(p.precio_venta_min),
      precio_venta_may: String(p.precio_venta_may),
      precio_promo: p.precio_promo ? String(p.precio_promo) : '',
      costo: p.costo ? String(p.costo) : '',
      stock: String(p.stock),
      imagen_url: p.imagen_url ?? '',
    });
    setDialogOpen(true);
  }

  function abrirDetalle(p: Producto) { setProductoDetalle(p); setDetalleOpen(true); }

  function cerrarDialog() { setDialogOpen(false); setEditando(null); reset(EMPTY_FORM); }

  function onSubmit(data: FormData) {
    const body = {
      nombre: data.nombre,
      descripcion: data.descripcion || undefined,
      uso_recomendado: data.uso_recomendado || undefined,
      categoria_id: Number(data.categoria_id),
      subcategoria_id: data.subcategoria_id ? Number(data.subcategoria_id) : undefined,
      marca_id: data.marca_id ? Number(data.marca_id) : undefined,
      presentacion_id: data.presentacion_id ? Number(data.presentacion_id) : undefined,
      origen_id: data.origen_id ? Number(data.origen_id) : undefined,
      proveedor_id: data.proveedor_id ? Number(data.proveedor_id) : undefined,
      precio_venta_min: Number(data.precio_venta_min),
      precio_venta_may: Number(data.precio_venta_may),
      precio_promo: data.precio_promo ? Number(data.precio_promo) : undefined,
      costo: data.costo ? Number(data.costo) : undefined,
      stock: Number(data.stock),
      imagen_url: data.imagen_url || undefined,
    };
    if (editando) actualizar.mutate({ id: editando.id, body });
    else crear.mutate(body);
  }

  const isPending = crear.isPending || actualizar.isPending;

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar productos..." className="pl-8" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          </div>
          <Select value={categFilter} onValueChange={(v) => { setCategFilter(v === 'todos' ? '' : v); setPagina(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {(categorias as { id: number; nombre: string }[]).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={abrirCrear} size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo producto</Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Precio min</TableHead>
              <TableHead className="text-right">Precio may</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
              ))
            ) : productos.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">No se encontraron productos</TableCell></TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id} className={!p.activo ? 'opacity-50' : ''}>
                  <TableCell className="w-12 p-1">
                    <ImagePreview src={p.imagen_url} alt={p.nombre} className="w-10 h-10" />
                  </TableCell>
                  <TableCell className="font-medium max-w-45 truncate">{p.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.categoria?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.marca?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right text-sm">${Number(p.precio_venta_min).toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right text-sm">${Number(p.precio_venta_may).toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.stock <= 0 ? 'destructive' : p.stock < 10 ? 'outline' : 'secondary'}>{p.stock}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.activo ? 'secondary' : 'outline'} className="cursor-pointer" onClick={() => toggleActivo.mutate({ id: p.id, activo: !p.activo })}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalle" onClick={() => abrirDetalle(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Desactivar" className="text-destructive hover:text-destructive" onClick={() => toggleActivo.mutate({ id: p.id, activo: false })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas} · {data?.total} productos</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) cerrarDialog(); }}>
        <DialogContent className="w-[750px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Grid principal: 3 columnas */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-3">

              {/* Fila 1: Nombre (2 cols) + imagen preview (1 col, rowspan) */}
              <div className="col-span-2 space-y-1.5">
                <Label>Nombre *</Label>
                <Input {...register('nombre', { required: true })} placeholder="Nombre del producto" />
              </div>
              <div className="row-span-3 space-y-1.5">
                <Label>Imagen</Label>
                <ImagePreview src={imagenUrl} alt="preview" className="w-full h-36 border" />
                <div className="flex gap-1 mt-1">
                  <Input {...register('imagen_url')} placeholder="https://..." className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={subiendoImagen}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/jpeg,image/png,image/webp,image/gif';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) subirImagen(file);
                      };
                      input.click();
                    }}
                    title="Subir imagen"
                  >
                    {subiendoImagen ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Pegá una URL o subí un archivo (jpg, png, webp)</p>
              </div>

              {/* Fila 2: Descripción (2 cols) */}
              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea {...register('descripcion')} placeholder="Descripción del producto" rows={2} />
              </div>

              {/* Fila 3: Usos recomendados (2 cols) */}
              <div className="col-span-2 space-y-1.5">
                <Label>Usos recomendados</Label>
                <Textarea {...register('uso_recomendado')} placeholder="Ej: Ideal para riego por goteo..." rows={2} />
              </div>

              {/* Separador */}
              <div className="col-span-3"><Separator /></div>

              {/* Clasificación: 3 cols x 2 filas */}
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={watch('categoria_id')} onValueChange={(v) => { setValue('categoria_id', v); setValue('subcategoria_id', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(categorias as { id: number; nombre: string }[]).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategoría</Label>
                <Select value={watch('subcategoria_id')} onValueChange={(v) => setValue('subcategoria_id', v)} disabled={!categoriaId || (subcategorias as { id: number }[]).length === 0}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(subcategorias as { id: number; nombre: string }[]).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Select value={watch('marca_id')} onValueChange={(v) => setValue('marca_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(marcas as { id: number; nombre: string }[]).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Presentación</Label>
                <Select value={watch('presentacion_id')} onValueChange={(v) => setValue('presentacion_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(presentaciones as { id: number; nombre: string }[]).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Origen</Label>
                <Select value={watch('origen_id')} onValueChange={(v) => setValue('origen_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(origenes as { id: number; nombre: string }[]).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                <Select value={watch('proveedor_id')} onValueChange={(v) => setValue('proveedor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(proveedores as { id: number; nombre: string }[]).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Separador */}
              <div className="col-span-3"><Separator /></div>

              {/* Precios y stock: 3 cols x 2 filas */}
              <div className="space-y-1.5">
                <Label>Precio minorista *</Label>
                <Input {...register('precio_venta_min', { required: true })} type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Precio mayorista *</Label>
                <Input {...register('precio_venta_may', { required: true })} type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Precio promocional</Label>
                <Input {...register('precio_promo')} type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Costo</Label>
                <Input {...register('costo')} type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input {...register('stock')} type="number" placeholder="0" />
              </div>
            </div>

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={cerrarDialog}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal detalle */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {productoDetalle && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 shrink-0">
                    <ImagePreview src={productoDetalle.imagen_url} alt={productoDetalle.nombre} className="w-24 h-24 border" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl leading-tight">{productoDetalle.nombre}</DialogTitle>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant={productoDetalle.activo ? 'secondary' : 'outline'}>{productoDetalle.activo ? 'Activo' : 'Inactivo'}</Badge>
                      <Badge variant={productoDetalle.stock <= 0 ? 'destructive' : productoDetalle.stock < 10 ? 'outline' : 'secondary'}>Stock: {productoDetalle.stock}</Badge>
                      {productoDetalle.categoria && <Badge variant="outline">{productoDetalle.categoria.nombre}</Badge>}
                      {productoDetalle.marca && <Badge variant="outline">{productoDetalle.marca.nombre}</Badge>}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {(productoDetalle.descripcion || productoDetalle.uso_recomendado) && (
                  <div className="space-y-3">
                    {productoDetalle.descripcion && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Descripción</p>
                        <p className="text-sm">{productoDetalle.descripcion}</p>
                      </div>
                    )}
                    {productoDetalle.uso_recomendado && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Usos recomendados</p>
                        <p className="text-sm">{productoDetalle.uso_recomendado}</p>
                      </div>
                    )}
                    <Separator />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Precios</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DetalleCard label="Precio minorista" value={`$${Number(productoDetalle.precio_venta_min).toLocaleString('es-AR')}`} />
                    <DetalleCard label="Precio mayorista" value={`$${Number(productoDetalle.precio_venta_may).toLocaleString('es-AR')}`} />
                    <DetalleCard label="Precio promo" value={productoDetalle.precio_promo ? `$${Number(productoDetalle.precio_promo).toLocaleString('es-AR')}` : '$0'} />
                    {productoDetalle.costo && <DetalleCard label="Costo" value={`$${Number(productoDetalle.costo).toLocaleString('es-AR')}`} />}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Clasificación</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <DetalleCard label="Categoría" value={productoDetalle.categoria?.nombre ?? '—'} />
                    <DetalleCard label="Subcategoría" value={productoDetalle.subcategoria?.nombre ?? '—'} />
                    <DetalleCard label="Marca" value={productoDetalle.marca?.nombre ?? '—'} />
                    <DetalleCard label="Presentación" value={productoDetalle.presentacion?.nombre ?? '—'} />
                    <DetalleCard label="Origen" value={productoDetalle.origen?.nombre ?? '—'} />
                    <DetalleCard label="Proveedor" value={productoDetalle.proveedor?.nombre ?? '—'} />
                  </div>
                </div>

                {productoDetalle.created_at && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Registrado el {new Date(productoDetalle.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setDetalleOpen(false)}>Cerrar</Button>
                <Button onClick={() => { setDetalleOpen(false); abrirEditar(productoDetalle); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetalleCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

