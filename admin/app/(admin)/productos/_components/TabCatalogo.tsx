'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Item { id: number; nombre: string }

interface Props {
  endpoint: string;
  label: string;
  labelPlural: string;
}

export function TabCatalogo({ endpoint, label, labelPlural }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [nombre, setNombre] = useState('');

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: [endpoint],
    queryFn: () => api.get(`/${endpoint}`).then(r => r.data),
  });

  const crear = useMutation({
    mutationFn: (nombre: string) => api.post(`/${endpoint}`, { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); toast.success(`${label} creada`); cerrar(); },
    onError: () => toast.error(`Error al crear ${label.toLowerCase()}`),
  });

  const editar = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => api.patch(`/${endpoint}/${id}`, { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); toast.success(`${label} actualizada`); cerrar(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/${endpoint}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); toast.success(`${label} eliminada`); },
    onError: () => toast.error(`No se puede eliminar — tiene productos asociados`),
  });

  function cerrar() { setDialogOpen(false); setEditando(null); setNombre(''); }

  function abrirCrear() { setEditando(null); setNombre(''); setDialogOpen(true); }
  function abrirEditar(item: Item) { setEditando(item); setNombre(item.nombre); setDialogOpen(true); }

  function submit() {
    if (!nombre.trim()) return;
    if (editando) editar.mutate({ id: editando.id, nombre });
    else crear.mutate(nombre);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} {labelPlural.toLowerCase()}</p>
        <Button size="sm" onClick={abrirCrear}><Plus className="h-4 w-4 mr-1" /> Nueva {label.toLowerCase()}</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Sin {labelPlural.toLowerCase()}</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => eliminar.mutate(item.id)}>
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editando ? `Editar ${label.toLowerCase()}` : `Nueva ${label.toLowerCase()}`}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={`Nombre de la ${label.toLowerCase()}`}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button onClick={submit} disabled={!nombre.trim() || crear.isPending || editar.isPending}>
              {editando ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
