'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  stock: number;
  categoria?: { nombre: string };
  marca?: { nombre: string };
}

export function TabStockBajo() {
  const [umbral, setUmbral] = useState('10');
  const [busqueda, setBusqueda] = useState('');

  const { data: productos, isLoading } = useQuery({
    queryKey: ['reportes', 'stock-bajo', umbral],
    queryFn: () =>
      api.get(`/reportes/stock/bajo?umbral=${umbral}`).then((r) => (r.data.productos ?? r.data) as Producto[]),
  });

  const filtrados = busqueda
    ? (productos ?? []).filter((p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : (productos ?? []);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Umbral de stock:</span>
          <Select value={umbral} onValueChange={(v) => setUmbral(v)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['5', '10', '15', '20', '50'].map((v) => (
                <SelectItem key={v} value={v}>{v} u.</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Filtrar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Contador */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>
            <span className="font-semibold">{filtrados.length}</span> producto{filtrados.length !== 1 ? 's' : ''} con stock ≤ {umbral} u.
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(4)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  ✅ Todo el stock está en nivel normal.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.categoria?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.marca?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.stock === 0 ? 'destructive' : 'outline'}>
                      {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
