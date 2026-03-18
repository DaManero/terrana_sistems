'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    cel: '',
    password: '',
    confirmar: '',
  });
  const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">
          El link de invitación es inválido o ya fue utilizado.
        </p>
        <p className="text-stone-500 text-sm">
          Solicitá una nueva invitación al administrador.
        </p>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (form.password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.confirmar) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setEstado('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          cel: form.cel || undefined,
          password: form.password,
          token,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensaje ?? 'Error al crear la cuenta.');
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
        <h2 className="text-xl font-semibold text-stone-800">¡Cuenta creada!</h2>
        <p className="text-stone-500 text-sm">En unos segundos te redirigimos al inicio.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-700" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            value={form.nombre}
            onChange={handleChange}
            placeholder="Tu nombre"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-700" htmlFor="apellido">
            Apellido
          </label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            required
            value={form.apellido}
            onChange={handleChange}
            placeholder="Tu apellido"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="El email al que llegó la invitación"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700" htmlFor="cel">
          Teléfono <span className="text-stone-400 font-normal">(opcional)</span>
        </label>
        <input
          id="cel"
          name="cel"
          type="tel"
          value={form.cel}
          onChange={handleChange}
          placeholder="Ej: 11 1234-5678"
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder:text-stone-400"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={handleChange}
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
          name="confirmar"
          type="password"
          required
          value={form.confirmar}
          onChange={handleChange}
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
        {estado === 'loading' ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-stone-800">Crear cuenta</h1>
          <p className="text-stone-500 text-sm">Completá tus datos para activar tu cuenta</p>
        </div>
        <Suspense fallback={<p className="text-center text-stone-400 text-sm">Cargando...</p>}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
