'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, PowerOff, Power } from 'lucide-react';
import { toast } from 'sonner';

interface MetodoEnvio {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  gratis_desde: number | null;
  activo: boolean;
}

interface FormState {
  nombre: string;
  descripcion: string;
  costo: string;
  gratis_desde: string;
}

const FORM_VACIO: FormState = { nombre: '', descripcion: '', costo: '', gratis_desde: '' };

export function TabMetodosEnvio() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<MetodoEnvio | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);

  // Traemos todos (incluyendo inactivos) para el panel admin
  const { data: metodos = [], isLoading } = useQuery<MetodoEnvio[]>({
    queryKey: ['metodos-envio-admin'],
    queryFn: () => api.get('/metodos-envio?todos=true').then(r => r.data),
  });

  const crear = useMutation({
    mutationFn: (data: object) => api.post('/metodos-envio', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metodos-envio-admin'] });
      toast.success('Método de envío creado');
      cerrar();
    },
    onError: () => toast.error('Error al crear el método de envío'),
  });

  const editar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api.patch(`/metodos-envio/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metodos-envio-admin'] });
      toast.success('Método de envío actualizado');
      cerrar();
    },
    onError: () => toast.error('Error al actualizar el método de envío'),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/metodos-envio/${id}`, { activo }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['metodos-envio-admin'] });
      toast.success(vars.activo ? 'Método activado' : 'Método desactivado');
    },
    onError: () => toast.error('Error al cambiar el estado'),
  });

  function cerrar() {
    setDialogOpen(false);
    setEditando(null);
    setForm(FORM_VACIO);
  }

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setDialogOpen(true);
  }

  function abrirEditar(m: MetodoEnvio) {
    setEditando(m);
    setForm({
      nombre: m.nombre,
      descripcion: m.descripcion ?? '',
      costo: String(m.costo),
      gratis_desde: m.gratis_desde != null ? String(m.gratis_desde) : '',
    });
    setDialogOpen(true);
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function buildPayload() {
    return {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      costo: parseFloat(form.costo),
      gratis_desde: form.gratis_desde !== '' ? parseFloat(form.gratis_desde) : null,
    };
  }

  function submit() {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');
    const costo = parseFloat(form.costo);
    if (isNaN(costo) || costo < 0) return toast.error('El costo debe ser un número válido');
    if (form.gratis_desde !== '') {
      const gd = parseFloat(form.gratis_desde);
      if (isNaN(gd) || gd < 0) return toast.error('"Gratis desde" debe ser un número válido');
    }

    if (editando) {
      editar.mutate({ id: editando.id, data: buildPayload() });
    } else {
      crear.mutate(buildPayload());
    }
  }

  const activos = metodos.filter(m => m.activo).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {metodos.length} método{metodos.length !== 1 ? 's' : ''} —{' '}
          <span className="text-green-600 font-medium">{activos} activo{activos !== 1 ? 's' : ''}</span>
        </p>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo método
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Gratis desde</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : metodos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No hay métodos de envío configurados
                </TableCell>
              </TableRow>
            ) : (
              metodos.map((m) => (
                <TableRow key={m.id} className={!m.activo ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {m.descripcion ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.costo === 0 ? (
                      <Badge variant="secondary">Gratis</Badge>
                    ) : (
                      `$${Number(m.costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {m.gratis_desde != null
                      ? `$${Number(m.gratis_desde).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={m.activo ? 'default' : 'outline'}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={m.activo ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-700'}
                        onClick={() => toggleActivo.mutate({ id: m.id, activo: !m.activo })}
                        title={m.activo ? 'Desactivar' : 'Activar'}
                      >
                        {m.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) cerrar(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar método de envío' : 'Nuevo método de envío'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Retiro en el local"
                value={form.nombre}
                onChange={e => handleChange('nombre', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Detalle visible para el cliente"
                rows={2}
                value={form.descripcion}
                onChange={e => handleChange('descripcion', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="costo">Costo ($) *</Label>
                <Input
                  id="costo"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.costo}
                  onChange={e => handleChange('costo', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Usá 0 para envío gratis fijo</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gratis_desde">Gratis desde ($)</Label>
                <Input
                  id="gratis_desde"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Opcional"
                  value={form.gratis_desde}
                  onChange={e => handleChange('gratis_desde', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Dejar vacío si no aplica</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cancelar</Button>
            <Button
              onClick={submit}
              disabled={crear.isPending || editar.isPending}
            >
              {editando ? 'Guardar cambios' : 'Crear método'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
