import { TabVentas } from './_components/TabVentas';

export default function VentasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
        <p className="text-muted-foreground text-sm">Gestión de pedidos y ventas</p>
      </div>
      <TabVentas />
    </div>
  );
}
