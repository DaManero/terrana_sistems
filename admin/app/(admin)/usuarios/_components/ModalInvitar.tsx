'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

export function ModalInvitar() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');

  const invitar = useMutation({
    mutationFn: (email: string) => api.post('/auth/invite', { email }),
    onSuccess: () => {
      toast.success('Invitación enviada correctamente');
      setOpen(false);
      setEmail('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje ??
        'Error al enviar la invitación';
      toast.error(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    invitar.mutate(email.trim());
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Mail className="h-4 w-4" />
        Invitar usuario
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEmail(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invitar nuevo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="email-invitar">Email del invitado</Label>
              <Input
                id="email-invitar"
                type="email"
                required
                placeholder="ejemplo@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                El invitado recibirá un link válido por 48 horas para completar su registro.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={invitar.isPending}>
                {invitar.isPending ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
