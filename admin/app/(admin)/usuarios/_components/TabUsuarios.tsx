'use client';

import { useState } from 'react';
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
import { ChevronLeft, ChevronRight, Search, Eye, PowerOff, Power } from 'lucide-react';
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
                    {u.aprobado ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">Sí</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No</Badge>
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
                        onClick={() => setDetalle(u)}
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

      {/* Dialog detalle */}
      <Dialog open={!!detalle} onOpenChange={(open) => !open && setDetalle(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de usuario</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Nombre completo</Label>
                  <p className="font-medium mt-0.5">{detalle.nombre} {detalle.apellido}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium mt-0.5">{detalle.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Teléfono</Label>
                  <p className="font-medium mt-0.5">{detalle.cel ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Rol</Label>
                  <p className="font-medium mt-0.5">{detalle.rol.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <div className="mt-0.5">
                    <Badge variant={detalle.activo ? 'default' : 'destructive'}>
                      {detalle.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cuenta aprobada</Label>
                  <div className="mt-0.5">
                    <Badge variant={detalle.aprobado ? 'outline' : 'secondary'}>
                      {detalle.aprobado ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Registrado</Label>
                  <p className="font-medium mt-0.5">
                    {new Date(detalle.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {detalle.direcciones && detalle.direcciones.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Direcciones ({detalle.direcciones.length})
                  </Label>
                  <div className="mt-1 space-y-2">
                    {detalle.direcciones.map((d) => (
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
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
