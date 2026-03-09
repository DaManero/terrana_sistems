'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface Proveedor {
  id: number;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
  activo: boolean;
}

interface FormData {
  nombre: string;
  contacto: string;
  email: string;
  telefono: string;
  direccion: string;
  notas: string;
}

const EMPTY: FormData = { nombre: '', contacto: '', email: '', telefono: '', direccion: '', notas: '' };

export function TabProveedores() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const { register, handleSubmit, reset } = useForm<FormData>({ defaultValues: EMPTY });

  const { data: proveedores = [], isLoading } = useQuery<Proveedor[]>({
    queryKey: ['proveedores'],
    queryFn: () => api.get('/proveedores').then(r => r.data),
  });

  const crear = useMutation({
    mutationFn: (body: object) => api.post('/proveedores', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); toast.success('Proveedor creado'); cerrar(); },
    onError: () => toast.error('Error al crear proveedor'),
  });

  const editar = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/proveedores/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); toast.success('Proveedor actualizado'); cerrar(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.patch(`/proveedores/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); toast.success('Estado actualizado'); },
  });

  function cerrar() { setDialogOpen(false); setEditando(null); reset(EMPTY); }

  function abrirCrear() { setEditando(null); reset(EMPTY); setDialogOpen(true); }
  function abrirEditar(p: Proveedor) {
    setEditando(p);
    reset({
      nombre: p.nombre,
      contacto: p.contacto ?? '',
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      direccion: p.direccion ?? '',
      notas: p.notas ?? '',
    });
    setDialogOpen(true);
  }

  function onSubmit(data: FormData) {
    const body = {
      nombre: data.nombre,
      contacto: data.contacto || undefined,
      email: data.email || undefined,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
      notas: data.notas || undefined,
    };
    if (editando) editar.mutate({ id: editando.id, body });
    else crear.mutate(body);
  }

  const isPending = crear.isPending || editar.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{proveedores.length} proveedores</p>
        <Button size="sm" onClick={abrirCrear}><Plus className="h-4 w-4 mr-1" /> Nuevo proveedor</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
              ))
            ) : proveedores.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin proveedores</TableCell></TableRow>
            ) : (
              proveedores.map((p) => (
                <TableRow key={p.id} className={!p.activo ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.contacto ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.telefono ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.activo ? 'secondary' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleActivo.mutate({ id: p.id, activo: !p.activo })}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => toggleActivo.mutate({ id: p.id, activo: false })}>
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) cerrar(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...register('nombre', { required: true })} placeholder="Nombre del proveedor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contacto</Label>
                <Input {...register('contacto')} placeholder="Nombre del contacto" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input {...register('telefono')} placeholder="+54 11..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="proveedor@ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input {...register('direccion')} placeholder="Dirección" />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea {...register('notas')} placeholder="Notas internas..." rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
