'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TabProductos } from './_components/TabProductos';
import { TabCategorias } from './_components/TabCategorias';
import { TabCatalogo } from './_components/TabCatalogo';
import { TabEtiquetas } from './_components/TabEtiquetas';
import { TabProveedores } from './_components/TabProveedores';

const TABS = [
  { id: 'productos',      label: 'Productos' },
  { id: 'categorias',     label: 'Categorías' },
  { id: 'marcas',         label: 'Marcas' },
  { id: 'presentaciones', label: 'Presentaciones' },
  { id: 'origenes',       label: 'Orígenes' },
  { id: 'etiquetas',      label: 'Etiquetas' },
  { id: 'proveedores',    label: 'Proveedores' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProductosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('productos');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">Gestión del catálogo y datos relacionados</p>
      </div>

      {/* Tab nav */}
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

      {/* Contenido */}
      <div>
        {activeTab === 'productos'      && <TabProductos />}
        {activeTab === 'categorias'     && <TabCategorias />}
        {activeTab === 'marcas'         && <TabCatalogo endpoint="marcas" label="Marca" labelPlural="Marcas" />}
        {activeTab === 'presentaciones' && <TabCatalogo endpoint="presentaciones" label="Presentación" labelPlural="Presentaciones" />}
        {activeTab === 'origenes'       && <TabCatalogo endpoint="origenes" label="Origen" labelPlural="Orígenes" />}
        {activeTab === 'etiquetas'      && <TabEtiquetas />}
        {activeTab === 'proveedores'    && <TabProveedores />}
      </div>
    </div>
  );
}

