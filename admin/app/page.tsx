import { redirect } from 'next/navigation';

// Redirige siempre al login — el layout de (admin) se encarga de
// redirigir al dashboard si ya hay sesión activa.
export default function HomePage() {
  redirect('/login');
}

