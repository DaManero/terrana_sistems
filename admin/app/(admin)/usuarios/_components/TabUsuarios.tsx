'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Eye, PowerOff, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Rol {
  id: number;
  nombre: string;
}

interface Direccion {
  id: number;
  alias?: string;
  calle: string;
  piso_depto?: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  predeterminada: boolean;
  telefono?: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  cel?: string;
  activo: boolean;
  aprobado: boolean;
  created_at: string;
  rol: Rol;
  direcciones?: Direccion[];
}

interface UsuariosPaginados {
  data: Usuario[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

interface FormEdicionCliente {
  nombre: string;
  apellido: string;
  email: string;
  cel: string;
  direccionId: number | null;
  calle: string;
  piso_depto: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
}

const ROL_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Admin':              'default',
  'Operador':           'secondary',
  'Cliente Mayorista':  'outline',
  'Cliente Minorista':  'outline',
};

export function TabUsuarios() {
  const qc = useQueryClient();
  const currentUser = getUser();
  const esAdmin = currentUser?.rol === 'Admin';

  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [detalle, setDetalle] = useState<Usuario | null>(null);
  const [rolEditado, setRolEditado] = useState<string>('');
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [formEdicion, setFormEdicion] = useState<FormEdicionCliente>({
    nombre: '',
    apellido: '',
    email: '',
    cel: '',
    direccionId: null,
    calle: '',
    piso_depto: '',
    localidad: '',
    provincia: '',
    codigo_postal: '',
  });

  // ─── Roles para el selector ──────────────────────────────────────────────
  const { data: roles = [] } = useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/users/roles').then((r) => r.data),
  });

  // ─── Listado paginado ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<UsuariosPaginados>({
    queryKey: ['usuarios', pagina, busquedaActiva, rolFiltro],
    queryFn: async () => {
      const params = new URLSearchParams({ pagina: String(pagina), porPagina: '15' });
      if (busquedaActiva) params.set('busqueda', busquedaActiva);
      if (rolFiltro !== 'todos') params.set('rolId', rolFiltro);
      const res = await api.get(`/users?${params}`);
      return res.data;
    },
  });

  const usuarios = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  const { data: detalleCompleto, isFetching: cargandoDetalle } = useQuery<Usuario>({
    queryKey: ['usuario-detalle', detalle?.id],
    queryFn: () => api.get(`/users/${detalle!.id}`).then((r) => r.data),
    enabled: !!detalle,
    staleTime: 0,
  });

  const detalleActual = detalleCompleto ?? detalle;

  useEffect(() => {
    if (!detalleActual) return;
    const direccionPrincipal =
      detalleActual.direcciones?.find((d) => d.predeterminada) ?? detalleActual.direcciones?.[0];

    setFormEdicion({
      nombre: detalleActual.nombre ?? '',
      apellido: detalleActual.apellido ?? '',
      email: detalleActual.email ?? '',
      cel: detalleActual.cel ?? '',
      direccionId: direccionPrincipal?.id ?? null,
      calle: direccionPrincipal?.calle ?? '',
      piso_depto: direccionPrincipal?.piso_depto ?? '',
      localidad: direccionPrincipal?.localidad ?? '',
      provincia: direccionPrincipal?.provincia ?? '',
      codigo_postal: direccionPrincipal?.codigo_postal ?? '',
    });
  }, [detalleActual]);

  // ─── Toggle estado (solo Admin) ──────────────────────────────────────────
  const toggleEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/users/${id}/estado`, { activo }),
    onSuccess: (_, { activo }) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(activo ? 'Usuario activado' : 'Usuario desactivado');
    },
    onError: () => toast.error('Error al cambiar el estado'),
  });

  // ─── Cambiar rol (solo Admin) ─────────────────────────────────────────────
  const cambiarRol = useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) =>
      api.patch(`/users/${id}/rol`, { rolId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setDetalle((prev) => prev ? { ...prev, rol: res.data.rol } : prev);
      toast.success('Rol actualizado correctamente');
    },
    onError: () => toast.error('Error al cambiar el rol'),
  });
  // ─── Cambiar aprobación (solo Admin) ──────────────────────────────────────
  const toggleAprobacion = useMutation({
    mutationFn: ({ id, aprobado }: { id: number; aprobado: boolean }) =>
      api.patch(`/users/${id}/aprobacion`, { aprobado }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setDetalle((prev) => prev ? { ...prev, aprobado: res.data.aprobado } : prev);
      toast.success(res.data.aprobado ? 'Usuario aprobado' : 'Aprobación revocada');
    },
    onError: () => toast.error('Error al cambiar la aprobación'),
  });

  // ─── Eliminar usuario (solo Admin) ──────────────────────────────────────
  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario eliminado');
      setUsuarioAEliminar(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje ??
        'Error al eliminar el usuario';
      toast.error(msg);
    },
  });

  const guardarDatosCliente = useMutation({
    mutationFn: () => {
      if (!detalleActual) throw new Error('No hay usuario seleccionado');
      return api.patch(`/users/${detalleActual.id}`, {
        nombre: formEdicion.nombre,
        apellido: formEdicion.apellido,
        email: formEdicion.email,
        cel: formEdicion.cel,
        direccion: {
          id: formEdicion.direccionId ?? undefined,
          calle: formEdicion.calle,
          piso_depto: formEdicion.piso_depto || undefined,
          localidad: formEdicion.localidad,
          provincia: formEdicion.provincia,
          codigo_postal: formEdicion.codigo_postal,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['usuario-detalle', detalleActual?.id] });
      setDetalle(res.data);
      toast.success('Datos del cliente actualizados');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; mensaje?: string } } })?.response?.data?.mensaje ??
        'Error al actualizar datos del cliente';
      toast.error(msg);
    },
  });

  const puedeGuardarCliente =
    !!detalleActual &&
    !!formEdicion.nombre.trim() &&
    !!formEdicion.apellido.trim() &&
    !!formEdicion.calle.trim() &&
    !!formEdicion.localidad.trim() &&
    !!formEdicion.provincia.trim() &&
    !!formEdicion.codigo_postal.trim();
  const handleBuscar = () => {
    setBusquedaActiva(busqueda);
    setPagina(1);
  };

  const handleRolChange = (value: string) => {
    setRolFiltro(value);
    setPagina(1);
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 flex-1 min-w-48 max-w-sm">
          <Input
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          />
          <Button variant="outline" size="icon" onClick={handleBuscar}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={rolFiltro} onValueChange={handleRolChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground ml-auto">
            {data.total} usuario{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Aprobado</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.nombre} {u.apellido}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROL_VARIANT[u.rol.nombre] ?? 'outline'}>
                      {u.rol.nombre}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.activo ? 'default' : 'destructive'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {esAdmin ? (
                      <button
                        onClick={() => toggleAprobacion.mutate({ id: u.id, aprobado: !u.aprobado })}
                        disabled={toggleAprobacion.isPending}
                        title={u.aprobado ? 'Revocar aprobación' : 'Aprobar usuario'}
                        className="cursor-pointer"
                      >
                        {u.aprobado ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">Sí</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground hover:bg-muted">No</Badge>
                        )}
                      </button>
                    ) : (
                      u.aprobado ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">Sí</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver detalle"
                        onClick={() => { setDetalle(u); setRolEditado(''); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {esAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.activo ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleEstado.mutate({ id: u.id, activo: !u.activo })}
                          disabled={toggleEstado.isPending}
                        >
                          {u.activo
                            ? <PowerOff className="h-4 w-4 text-destructive" />
                            : <Power className="h-4 w-4 text-green-600" />
                          }
                        </Button>
                      )}
                      {esAdmin && currentUser?.id !== u.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar usuario"
                          onClick={() => setUsuarioAEliminar(u)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline" size="icon"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline" size="icon"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!detalle} onOpenChange={(open) => !open && setDetalle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de usuario</DialogTitle>
          </DialogHeader>
          {detalleActual && (
            <div className="space-y-4 py-2">
              {cargandoDetalle && (
                <p className="text-xs text-muted-foreground">Actualizando datos...</p>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Nombre completo</Label>
                  <div className="grid grid-cols-2 gap-2 mt-0.5">
                    <Input
                      value={formEdicion.nombre}
                      onChange={(e) => setFormEdicion((prev) => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre"
                      className="h-8"
                    />
                    <Input
                      value={formEdicion.apellido}
                      onChange={(e) => setFormEdicion((prev) => ({ ...prev, apellido: e.target.value }))}
                      placeholder="Apellido"
                      className="h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <Input
                    value={formEdicion.email}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="cliente@email.com"
                    className="h-8 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Teléfono</Label>
                  <Input
                    value={formEdicion.cel}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, cel: e.target.value }))}
                    placeholder="11 1234 5678"
                    className="h-8 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Rol</Label>
                  {esAdmin ? (
                    <div className="mt-0.5 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <Select
                          value={String(rolEditado || detalleActual.rol.id)}
                          onValueChange={(v) => setRolEditado(v)}
                        >
                          <SelectTrigger className="h-8 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          cambiarRol.isPending ||
                          (!rolEditado || Number(rolEditado) === detalleActual.rol.id)
                        }
                        onClick={() =>
                          cambiarRol.mutate({ id: detalleActual.id, rolId: Number(rolEditado) })
                        }
                      >
                        {cambiarRol.isPending ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium mt-0.5">{detalleActual.rol.nombre}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <div className="mt-0.5">
                    <Badge variant={detalleActual.activo ? 'default' : 'destructive'}>
                      {detalleActual.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cuenta aprobada</Label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={detalleActual.aprobado ? 'outline' : 'secondary'}
                      className={detalleActual.aprobado ? 'text-green-600 border-green-300' : ''}>
                      {detalleActual.aprobado ? 'Sí' : 'No'}
                    </Badge>
                    {esAdmin && (
                      <Button
                        size="sm"
                        variant={detalleActual.aprobado ? 'outline' : 'default'}
                        disabled={toggleAprobacion.isPending}
                        onClick={() => toggleAprobacion.mutate({ id: detalleActual.id, aprobado: !detalleActual.aprobado })}
                      >
                        {toggleAprobacion.isPending
                          ? 'Guardando...'
                          : detalleActual.aprobado ? 'Revocar' : 'Aprobar'}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Registrado</Label>
                  <p className="font-medium mt-0.5">
                    {new Date(detalleActual.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Dirección principal</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Input
                    value={formEdicion.calle}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, calle: e.target.value }))}
                    placeholder="Calle y altura"
                    className="h-8 col-span-2"
                  />
                  <Input
                    value={formEdicion.piso_depto}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, piso_depto: e.target.value }))}
                    placeholder="Piso / Depto"
                    className="h-8"
                  />
                  <Input
                    value={formEdicion.codigo_postal}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, codigo_postal: e.target.value }))}
                    placeholder="Código postal"
                    className="h-8"
                  />
                  <Input
                    value={formEdicion.localidad}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, localidad: e.target.value }))}
                    placeholder="Localidad"
                    className="h-8"
                  />
                  <Input
                    value={formEdicion.provincia}
                    onChange={(e) => setFormEdicion((prev) => ({ ...prev, provincia: e.target.value }))}
                    placeholder="Provincia"
                    className="h-8"
                  />
                </div>
                {detalleActual.direcciones && detalleActual.direcciones.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Este formulario actualiza la dirección principal del cliente.
                  </p>
                )}
              </div>

              {detalleActual.direcciones && detalleActual.direcciones.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Direcciones ({detalleActual.direcciones.length})
                  </Label>
                  <div className="mt-1 space-y-2">
                    {detalleActual.direcciones.map((d) => (
                      <div key={d.id} className="text-sm border rounded-md p-3 bg-muted/40">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium">{d.alias ?? 'Dirección'}</span>
                          {d.predeterminada && (
                            <Badge variant="secondary" className="text-xs py-0">Principal</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {d.calle}{d.piso_depto ? `, ${d.piso_depto}` : ''} — {d.localidad}, {d.provincia} ({d.codigo_postal})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => guardarDatosCliente.mutate()}
              disabled={!puedeGuardarCliente || guardarDatosCliente.isPending}
            >
              {guardarDatosCliente.isPending ? 'Guardando datos...' : 'Guardar datos'}
            </Button>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmación eliminar */}
      <Dialog open={!!usuarioAEliminar} onOpenChange={(open) => !open && setUsuarioAEliminar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
          </DialogHeader>
          {usuarioAEliminar && (
            <p className="text-sm text-muted-foreground py-2">
              ¿Estás seguro que querés eliminar a{' '}
              <strong className="text-foreground">
                {usuarioAEliminar.nombre} {usuarioAEliminar.apellido}
              </strong>?
              Esta acción no se puede deshacer.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioAEliminar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={eliminar.isPending}
              onClick={() => usuarioAEliminar && eliminar.mutate(usuarioAEliminar.id)}
            >
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
