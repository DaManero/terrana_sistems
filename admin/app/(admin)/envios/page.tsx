"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TabMetodosEnvio } from './_components/TabMetodosEnvio';
import { TabLotesEnvio } from './_components/TabLotesEnvio';

const TABS = [
  { id: 'metodos', label: 'Métodos de envío' },
  { id: 'lotes', label: 'Lotes de envíos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EnviosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('metodos');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Envíos</h1>
        <p className="text-muted-foreground text-sm">
          Configurá métodos de envío y gestioná lotes de despacho diarios.
        </p>
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
        {activeTab === 'metodos' && <TabMetodosEnvio />}
        {activeTab === 'lotes' && <TabLotesEnvio />}
      </div>
    </div>
  );
}
