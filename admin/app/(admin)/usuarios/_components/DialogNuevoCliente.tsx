'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail } from 'lucide-react';

interface Rol {
  id: number;
  nombre: string;
}

interface FormState {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol_id: string;
  aprobado: boolean;
  enviarActivacion: boolean;
  calle: string;
  piso_depto: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  observaciones: string;
}

const FORM_INICIAL: FormState = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  rol_id: '',
  aprobado: false,
  enviarActivacion: true,
  calle: '',
  piso_depto: '',
  localidad: '',
  provincia: '',
  codigo_postal: '',
  observaciones: '',
};

export function DialogNuevoCliente() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const { data: roles = [] } = useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/users/roles').then((r) => r.data),
    staleTime: Infinity,
    enabled: open,
  });

  const rolSeleccionado = roles.find((r) => r.id === Number(form.rol_id));
  const esMayorista = rolSeleccionado?.nombre.toLowerCase().includes('mayor') ?? false;

  const crearUsuario = useMutation({
    mutationFn: () =>
      api.post('/users', {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() ? form.email.trim().toLowerCase() : undefined,
        cel: form.telefono.trim() || undefined,
        rol_id: Number(form.rol_id),
        aprobado: esMayorista ? true : form.aprobado,
        enviarActivacion: form.email.trim() ? form.enviarActivacion : false,
        observaciones: form.observaciones.trim() || undefined,
        calle: form.calle.trim(),
        piso_depto: form.piso_depto.trim() || undefined,
        localidad: form.localidad.trim(),
        provincia: form.provincia.trim(),
        codigo_postal: form.codigo_postal.trim(),
      }),
    onSuccess: (res) => {
      const msg = res.data.activacionEnviada
        ? 'Cliente creado. Se envió el email de activación.'
        : 'Cliente creado correctamente';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm(FORM_INICIAL);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Error al crear el cliente');
    },
  });

  const tieneEmail = !!form.email.trim();

  const puedeGuardar =
    form.nombre.trim() &&
    form.apellido.trim() &&
    form.rol_id &&
    form.calle.trim() &&
    form.localidad.trim() &&
    form.provincia.trim() &&
    form.codigo_postal.trim();

  function handleClose() {
    setOpen(false);
    setForm(FORM_INICIAL);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">

          {/* Datos personales */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Datos personales
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Juan"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido *</Label>
                <Input
                  placeholder="García"
                  value={form.apellido}
                  onChange={(e) => set('apellido', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Email{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>

            {/* Email de activación */}
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
              tieneEmail ? 'bg-muted/30' : 'bg-muted/10 opacity-50'
            }`}>
              <input
                id="enviarActivacion"
                type="checkbox"
                checked={form.enviarActivacion && tieneEmail}
                disabled={!tieneEmail}
                onChange={(e) => set('enviarActivacion', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="enviarActivacion"
                className={tieneEmail ? 'cursor-pointer select-none' : 'select-none cursor-not-allowed'}
              >
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Enviar email de activación
                </span>
                <span className="text-xs text-muted-foreground">
                  {tieneEmail
                    ? 'El cliente recibirá un link para crear su propia contraseña (válido 48 hs)'
                    : 'Ingresá un email para habilitar esta opción'}
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                placeholder="11 1234-5678"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de cliente *</Label>
              <Select value={form.rol_id} onValueChange={(v) => set('rol_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.rol_id && !esMayorista && (
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <input
                  id="aprobado"
                  type="checkbox"
                  checked={form.aprobado}
                  onChange={(e) => set('aprobado', e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <label htmlFor="aprobado" className="text-sm cursor-pointer select-none">
                  Marcar como mayorista aprobado
                </label>
              </div>
            )}

            {esMayorista && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Este rol implica acceso mayorista — el cliente quedará aprobado automáticamente.
              </p>
            )}
          </div>

          <Separator />

          {/* Direccion */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dirección
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Calle y altura *</Label>
                <Input
                  placeholder="Av. Corrientes 1234"
                  value={form.calle}
                  onChange={(e) => set('calle', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Depto / Piso{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="3° B"
                  value={form.piso_depto}
                  onChange={(e) => set('piso_depto', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Localidad *</Label>
                <Input
                  placeholder="Buenos Aires"
                  value={form.localidad}
                  onChange={(e) => set('localidad', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Provincia *</Label>
                <Input
                  placeholder="Buenos Aires"
                  value={form.provincia}
                  onChange={(e) => set('provincia', e.target.value)}
                />
              </div>
            </div>

            <div className="w-1/3 space-y-1.5">
              <Label>Código Postal *</Label>
              <Input
                placeholder="1043"
                value={form.codigo_postal}
                onChange={(e) => set('codigo_postal', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label>Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <textarea
              className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Notas internas sobre el cliente..."
              value={form.observaciones}
              onChange={(e) => set('observaciones', e.target.value)}
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={crearUsuario.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => crearUsuario.mutate()}
            disabled={!puedeGuardar || crearUsuario.isPending}
          >
            {crearUsuario.isPending ? 'Creando...' : 'Crear cliente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
