'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SolicitudUsuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: { nombre: string };
}

interface Solicitud {
  id: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  mensaje_cliente?: string;
  mensaje_admin?: string;
  created_at: string;
  updated_at: string;
  usuario: SolicitudUsuario;
}

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'secondary',
  aprobada:  'default',
  rechazada: 'destructive',
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
};

export function TabSolicitudesMayorista() {
  const qc = useQueryClient();
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
  const [resolviendo, setResolviendo] = useState<Solicitud | null>(null);
  const [accion, setAccion] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [mensajeAdmin, setMensajeAdmin] = useState('');

  const { data: solicitudes = [], isLoading } = useQuery<Solicitud[]>({
    queryKey: ['solicitudes-mayorista', estadoFiltro],
    queryFn: async () => {
      const params = estadoFiltro !== 'todas' ? `?estado=${estadoFiltro}` : '';
      const res = await api.get(`/users/mayorista/solicitudes${params}`);
      return res.data;
    },
  });

  const resolver = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { accion: 'aprobar' | 'rechazar'; mensaje_admin?: string } }) =>
      api.patch(`/users/mayorista/solicitudes/${id}`, body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['solicitudes-mayorista'] });
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(
        variables.body.accion === 'aprobar'
          ? 'Solicitud aprobada — el usuario ahora tiene acceso mayorista'
          : 'Solicitud rechazada'
      );
      cerrarDialog();
    },
    onError: () => toast.error('Error al procesar la solicitud'),
  });

  function abrirDialog(s: Solicitud, a: 'aprobar' | 'rechazar') {
    setResolviendo(s);
    setAccion(a);
    setMensajeAdmin(a === 'aprobar' ? 'Bienvenido como cliente mayorista de Terrana.' : '');
  }

  function cerrarDialog() {
    setResolviendo(null);
    setMensajeAdmin('');
  }

  function confirmar() {
    if (!resolviendo) return;
    resolver.mutate({
      id: resolviendo.id,
      body: { accion, ...(mensajeAdmin ? { mensaje_admin: mensajeAdmin } : {}) },
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtro de estado */}
      <div className="flex items-center gap-3">
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="aprobada">Aprobadas</SelectItem>
            <SelectItem value="rechazada">Rechazadas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mensaje del cliente</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead>Fecha solicitud</TableHead>
              <TableHead className="text-right w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : solicitudes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No hay solicitudes {estadoFiltro !== 'todas' ? ESTADO_LABEL[estadoFiltro]?.toLowerCase() + 's' : ''}
                </TableCell>
              </TableRow>
            ) : (
              solicitudes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.usuario.nombre} {s.usuario.apellido}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.usuario.email}</TableCell>
                  <TableCell className="text-sm max-w-xs">
                    {s.mensaje_cliente ? (
                      <span className="line-clamp-2 text-muted-foreground">{s.mensaje_cliente}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Sin mensaje</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={ESTADO_VARIANT[s.estado]}>
                      {ESTADO_LABEL[s.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.estado === 'pendiente' ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Aprobar"
                          onClick={() => abrirDialog(s, 'aprobar')}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Rechazar"
                          onClick={() => abrirDialog(s, 'rechazar')}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {s.mensaje_admin ? '✓ Con nota' : '—'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog confirmar acción */}
      <Dialog open={!!resolviendo} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {accion === 'aprobar' ? 'Aprobar solicitud mayorista' : 'Rechazar solicitud mayorista'}
            </DialogTitle>
          </DialogHeader>
          {resolviendo && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                <p><span className="font-medium">Cliente: </span>{resolviendo.usuario.nombre} {resolviendo.usuario.apellido}</p>
                <p><span className="font-medium">Email: </span>{resolviendo.usuario.email}</p>
                {resolviendo.mensaje_cliente && (
                  <p><span className="font-medium">Mensaje: </span>{resolviendo.mensaje_cliente}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mensaje_admin">
                  Mensaje para el cliente <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="mensaje_admin"
                  placeholder={
                    accion === 'aprobar'
                      ? 'Ej: Bienvenido como cliente mayorista de Terrana.'
                      : 'Ej: Necesitamos más información. Por favor contactanos.'
                  }
                  value={mensajeAdmin}
                  onChange={(e) => setMensajeAdmin(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cerrarDialog}>Cancelar</Button>
            <Button
              variant={accion === 'aprobar' ? 'default' : 'destructive'}
              onClick={confirmar}
              disabled={resolver.isPending}
            >
              {accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
