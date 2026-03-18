'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">El link es inválido o ya fue utilizado.</p>
        <a href="/" className="text-stone-600 underline text-sm">Volver al inicio</a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setEstado('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensaje ?? 'Token inválido o expirado.');
      }

      setEstado('success');
      setTimeout(() => router.push('/'), 3000);
    } catch (err: unknown) {
      setEstado('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error. Intentá nuevamente.');
    }
  }

  if (estado === 'success') {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-stone-800">¡Cuenta activada!</h2>
        <p className="text-stone-500 text-sm">Tu contraseña fue creada correctamente. En unos segundos te redirigimos.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700" htmlFor="confirmar">
          Confirmar contraseña
        </label>
        <input
          id="confirmar"
          type="password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repetí la contraseña"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      {errorMsg && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={estado === 'loading'}
        className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        {estado === 'loading' ? 'Guardando...' : 'Crear contraseña'}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-stone-800">Activá tu cuenta</h1>
          <p className="text-stone-500 text-sm">Creá una contraseña para acceder a tu cuenta</p>
        </div>
        <Suspense fallback={<p className="text-center text-stone-400 text-sm">Cargando...</p>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
