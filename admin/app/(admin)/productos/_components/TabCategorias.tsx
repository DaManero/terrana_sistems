'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Subcategoria { id: number; nombre: string }
interface Categoria { id: number; nombre: string; subcategorias: Subcategoria[] }

export function TabCategorias() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubOpen, setDialogSubOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [editandoSub, setEditandoSub] = useState<Subcategoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [nombreSub, setNombreSub] = useState('');
  const [categoriaParent, setCategoriaParent] = useState<number | null>(null);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());

  const { data: categorias = [], isLoading } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then(r => r.data),
  });

  const crearCat = useMutation({
    mutationFn: (nombre: string) => api.post('/categorias', { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoría creada'); cerrar(); },
    onError: () => toast.error('Error al crear categoría'),
  });

  const editarCat = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => api.patch(`/categorias/${id}`, { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoría actualizada'); cerrar(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const eliminarCat = useMutation({
    mutationFn: (id: number) => api.delete(`/categorias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoría eliminada'); },
    onError: () => toast.error('No se puede eliminar — tiene productos asociados'),
  });

  const crearSub = useMutation({
    mutationFn: ({ nombre, categoria_id }: { nombre: string; categoria_id: number }) =>
      api.post('/subcategorias', { nombre, categoria_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Subcategoría creada'); cerrarSub(); },
    onError: () => toast.error('Error al crear subcategoría'),
  });

  const editarSub = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => api.patch(`/subcategorias/${id}`, { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Subcategoría actualizada'); cerrarSub(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const eliminarSub = useMutation({
    mutationFn: (id: number) => api.delete(`/subcategorias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Subcategoría eliminada'); },
    onError: () => toast.error('No se puede eliminar — tiene productos asociados'),
  });

  function cerrar() { setDialogOpen(false); setEditando(null); setNombre(''); }
  function cerrarSub() { setDialogSubOpen(false); setEditandoSub(null); setNombreSub(''); setCategoriaParent(null); }

  function abrirCrear() { setEditando(null); setNombre(''); setDialogOpen(true); }
  function abrirEditar(c: Categoria) { setEditando(c); setNombre(c.nombre); setDialogOpen(true); }

  function abrirCrearSub(categoriaId: number) {
    setEditandoSub(null); setNombreSub(''); setCategoriaParent(categoriaId); setDialogSubOpen(true);
  }
  function abrirEditarSub(sub: Subcategoria, categoriaId: number) {
    setEditandoSub(sub); setNombreSub(sub.nombre); setCategoriaParent(categoriaId); setDialogSubOpen(true);
  }

  function toggleExpandir(id: number) {
    setExpandidas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function submitCat() {
    if (!nombre.trim()) return;
    if (editando) editarCat.mutate({ id: editando.id, nombre });
    else crearCat.mutate(nombre);
  }

  function submitSub() {
    if (!nombreSub.trim() || !categoriaParent) return;
    if (editandoSub) editarSub.mutate({ id: editandoSub.id, nombre: nombreSub });
    else crearSub.mutate({ nombre: nombreSub, categoria_id: categoriaParent });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{categorias.length} categorías</p>
        <Button size="sm" onClick={abrirCrear}><Plus className="h-4 w-4 mr-1" /> Nueva categoría</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Subcategorías</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : categorias.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin categorías</TableCell></TableRow>
            ) : (
              categorias.map((cat) => (
                <Fragment key={cat.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        onClick={() => toggleExpandir(cat.id)}
                        className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                      >
                        {expandidas.has(cat.id)
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                        {cat.nombre}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat.subcategorias.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirCrearSub(cat.id)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Sub
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => eliminarCat.mutate(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandidas.has(cat.id) && cat.subcategorias.map((sub) => (
                    <TableRow key={`sub-${sub.id}`} className="bg-muted/30">
                      <TableCell className="pl-10 text-sm text-muted-foreground">{sub.nombre}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditarSub(sub, cat.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => eliminarSub.mutate(sub.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog categoría */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) cerrar(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editando ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la categoría" onKeyDown={(e) => e.key === 'Enter' && submitCat()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button onClick={submitCat} disabled={!nombre.trim() || crearCat.isPending || editarCat.isPending}>
              {editando ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog subcategoría */}
      <Dialog open={dialogSubOpen} onOpenChange={(o) => { if (!o) cerrarSub(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editandoSub ? 'Editar subcategoría' : 'Nueva subcategoría'}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={nombreSub} onChange={(e) => setNombreSub(e.target.value)} placeholder="Nombre de la subcategoría" onKeyDown={(e) => e.key === 'Enter' && submitSub()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarSub}>Cancelar</Button>
            <Button onClick={submitSub} disabled={!nombreSub.trim() || crearSub.isPending || editarSub.isPending}>
              {editandoSub ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
