'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import { TabUsuarios } from './_components/TabUsuarios';
import { TabSolicitudesMayorista } from './_components/TabSolicitudesMayorista';
import { ModalInvitar } from './_components/ModalInvitar';

const TABS = [
  { id: 'usuarios',   label: 'Usuarios' },
  { id: 'mayoristas', label: 'Solicitudes mayorista' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function UsuariosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('usuarios');
  const currentUser = getUser();
  const esAdmin = currentUser?.rol === 'Admin';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de cuentas y solicitudes de acceso mayorista
          </p>
        </div>
        {esAdmin && <ModalInvitar />}
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'usuarios'   && <TabUsuarios />}
        {activeTab === 'mayoristas' && <TabSolicitudesMayorista />}
      </div>
    </div>
  );
}

