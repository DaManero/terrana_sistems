'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TabHistorial } from './_components/TabHistorial';
import { TabAjuste } from './_components/TabAjuste';
import { TabStockBajo } from './_components/TabStockBajo';

const TABS = [
  { id: 'historial',  label: 'Historial de movimientos' },
  { id: 'stock-bajo', label: 'Stock bajo' },
  { id: 'ajuste',     label: 'Ajuste manual' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<TabId>('historial');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground">Historial de movimientos y ajustes de inventario</p>
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
        {activeTab === 'historial'  && <TabHistorial />}
        {activeTab === 'stock-bajo' && <TabStockBajo />}
        {activeTab === 'ajuste'     && <TabAjuste />}
      </div>
    </div>
  );
}
