'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { saveSession, hasAdminAccess } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';


const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySending, setRecoverySending] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setLoginFailed(false);
    try {
      const res = await api.post('/auth/login', data);
      const { token, usuario } = res.data;

      if (!hasAdminAccess(usuario)) {
        toast.error('Acceso denegado', {
          description: 'Solo administradores y operadores pueden ingresar.',
        });
        return;
      }

      saveSession(token, usuario);
      toast.success(`Bienvenido, ${usuario.nombre}`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      toast.error('Error al iniciar sesión', {
        description: error.response?.data?.message ?? 'Verificá tus credenciales.',
      });
      if (error.response?.status === 401) {
        setLoginFailed(true);
        setRecoveryEmail(data.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    setRecoverySending(true);
    try {
      await api.post('/auth/forgot-password', { email: recoveryEmail });
      toast.success('Email enviado', {
        description: 'Si el email está registrado, recibirás un link para restablecer tu contraseña.',
      });
      setRecoveryOpen(false);
    } catch {
      toast.error('No se pudo enviar el email. Intentá más tarde.');
    } finally {
      setRecoverySending(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/terrana.png"
              alt="Terrana"
              width={160}
              className="mx-auto mb-2"
            />
            <CardDescription>Ingresá para acceder al panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@terrana.com"
                  {...register('email')}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>

              {loginFailed && (
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground text-sm"
                  onClick={() => {
                    setRecoveryEmail(getValues('email'));
                    setRecoveryOpen(true);
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Te enviaremos un link a tu email para que puedas restablecer tu contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoveryOpen(false)} disabled={recoverySending}>
              Cancelar
            </Button>
            <Button onClick={handleRecovery} disabled={recoverySending || !recoveryEmail}>
              {recoverySending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
