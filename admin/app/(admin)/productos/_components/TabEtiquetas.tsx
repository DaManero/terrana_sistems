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

interface Etiqueta { id: number; nombre: string; slug: string; color?: string }

const COLORES_PRESET = [
  '#594d0e', '#7a6a14', '#a08c22', '#c9b96a',
  '#4a5c3f', '#6b8560', '#3a6b8a', '#9b3a2f', '#b8860b',
];

export function TabEtiquetas() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  const [form, setForm] = useState({ nombre: '', slug: '', color: '#594d0e' });

  const { data: etiquetas = [], isLoading } = useQuery<Etiqueta[]>({
    queryKey: ['etiquetas'],
    queryFn: () => api.get('/etiquetas').then(r => r.data),
  });

  const crear = useMutation({
    mutationFn: (body: object) => api.post('/etiquetas', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['etiquetas'] }); toast.success('Etiqueta creada'); cerrar(); },
    onError: () => toast.error('Error al crear etiqueta'),
  });

  const editar = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/etiquetas/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['etiquetas'] }); toast.success('Etiqueta actualizada'); cerrar(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/etiquetas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['etiquetas'] }); toast.success('Etiqueta eliminada'); },
    onError: () => toast.error('No se puede eliminar — tiene productos asociados'),
  });

  function cerrar() { setDialogOpen(false); setEditando(null); setForm({ nombre: '', slug: '', color: '#594d0e' }); }

  function abrirCrear() { setEditando(null); setForm({ nombre: '', slug: '', color: '#594d0e' }); setDialogOpen(true); }
  function abrirEditar(e: Etiqueta) {
    setEditando(e);
    setForm({ nombre: e.nombre, slug: e.slug, color: e.color ?? '#594d0e' });
    setDialogOpen(true);
  }

  function autoSlug(nombre: string) {
    return nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function submit() {
    if (!form.nombre.trim()) return;
    const body = { nombre: form.nombre, slug: form.slug || autoSlug(form.nombre), color: form.color };
    if (editando) editar.mutate({ id: editando.id, body });
    else crear.mutate(body);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{etiquetas.length} etiquetas</p>
        <Button size="sm" onClick={abrirCrear}><Plus className="h-4 w-4 mr-1" /> Nueva etiqueta</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : etiquetas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin etiquetas</TableCell></TableRow>
            ) : (
              etiquetas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {e.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />}
                      {e.nombre}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{e.slug}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.color ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => eliminar.mutate(e.id)}>
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
          <DialogHeader><DialogTitle>{editando ? 'Editar etiqueta' : 'Nueva etiqueta'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="Ej: Sin TACC"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="sin-tacc"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES_PRESET.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border border-border"
                  title="Color personalizado"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.nombre.trim() || crear.isPending || editar.isPending}>
              {editando ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
