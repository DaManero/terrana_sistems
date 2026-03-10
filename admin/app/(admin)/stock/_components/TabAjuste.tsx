'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackagePlus, PackageMinus } from 'lucide-react';
import { toast } from 'sonner';

interface Producto {
  id: number;
  nombre: string;
  stock: number;
}

export function TabAjuste() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  const { data: productos } = useQuery({
    queryKey: ['productos', 'todos'],
    queryFn: () =>
      api.get('/productos?porPagina=500&soloActivos=false').then((r) =>
        (r.data.data ?? r.data) as Producto[]
      ),
  });

  const sugerencias = useMemo(() => {
    if (!busqueda.trim() || productoSeleccionado) return [];
    return (productos ?? [])
      .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .slice(0, 8);
  }, [busqueda, productos, productoSeleccionado]);

  const ajuste = useMutation({
    mutationFn: (payload: { producto_id: number; cantidad: number; motivo: string }) =>
      api.post('/stock/ajuste', payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success('Ajuste registrado', {
        description: `Stock actualizado: ${data.stock_anterior} a ${data.stock_nuevo}`,
      });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['reportes', 'stock-bajo'] });
      setCantidad('');
      setMotivo('');
      setProductoSeleccionado(null);
      setBusqueda('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error('Error al ajustar stock', {
        description: err.response?.data?.message ?? 'Verifica los datos ingresados.',
      });
    },
  });

  const cantidadNum = Number(cantidad);
  const puedeEnviar =
    productoSeleccionado !== null &&
    cantidad !== '' &&
    !isNaN(cantidadNum) &&
    cantidadNum !== 0 &&
    motivo.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado) return;
    ajuste.mutate({ producto_id: productoSeleccionado.id, cantidad: cantidadNum, motivo: motivo.trim() });
  };

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajuste manual de stock</CardTitle>
          <CardDescription>
            Usa valores positivos para entradas y negativos para salidas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Producto</Label>
              {productoSeleccionado ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{productoSeleccionado.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{productoSeleccionado.stock} u.</Badge>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { setProductoSeleccionado(null); setBusqueda(''); }}
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    autoComplete="off"
                  />
                  {sugerencias.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {sugerencias.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => { setProductoSeleccionado(p); setBusqueda(p.nombre); }}
                        >
                          <span>{p.nombre}</span>
                          <Badge variant={p.stock === 0 ? 'destructive' : p.stock <= 5 ? 'outline' : 'secondary'}>
                            {p.stock} u.
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cantidad">
                Cantidad <span className="text-muted-foreground font-normal text-xs">(+ entrada / - salida)</span>
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setCantidad((v) => String((Number(v) || 0) + 1))}>
                  <PackagePlus className="h-4 w-4" />
                </Button>
                <Input
                  id="cantidad"
                  type="number"
                  placeholder="ej: 10 o -5"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="text-center font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setCantidad((v) => String((Number(v) || 0) - 1))}>
                  <PackageMinus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                placeholder="ej: Recepcion de mercaderia, rotura, correccion..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>

            {productoSeleccionado && cantidadNum !== 0 && !isNaN(cantidadNum) && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Stock resultante:</span>
                <span className="font-semibold font-mono">
                  {productoSeleccionado.stock} a {productoSeleccionado.stock + cantidadNum}
                </span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!puedeEnviar || ajuste.isPending}>
              {ajuste.isPending ? 'Guardando...' : 'Confirmar ajuste'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
