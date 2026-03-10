'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { clearSession, getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Truck,
  BarChart2,
  LogOut,
  Ticket,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',         icon: LayoutDashboard },
  { label: 'Productos',    href: '/productos',          icon: Package },
  { label: 'Ventas',       href: '/ventas',             icon: ShoppingCart },
  { label: 'Stock',        href: '/stock',              icon: Warehouse },
  { label: 'Usuarios',     href: '/usuarios',           icon: Users },
  { label: 'Descuentos',   href: '/descuentos',         icon: Ticket },
  { label: 'Catálogos',    href: '/catalogos',          icon: Tag },
  { label: 'Envíos',       href: '/envios',             icon: Truck },
  { label: 'Reportes',     href: '/reportes',           icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearSession();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-6">
        <Image
          src="/Tarjeta Frente.png"
          alt="Terrana"
          width={180}
          height={72}
          className="object-contain"
          priority
        />
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <span
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                pathname.startsWith(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User */}
      <div className="px-3 py-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user?.nombre?.[0]}{user?.apellido?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nombre} {user?.apellido}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.rol}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
