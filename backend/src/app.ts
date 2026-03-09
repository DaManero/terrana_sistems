import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middlewares/error.middleware';

// Rutas
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes';
import categoriasRoutes from './routes/categorias.routes';
import subcategoriasRoutes from './routes/subcategorias.routes';
import marcasRoutes from './routes/marcas.routes';
import presentacionesRoutes from './routes/presentaciones.routes';
import origenesRoutes from './routes/origenes.routes';
import proveedoresRoutes from './routes/proveedores.routes';
import etiquetasRoutes from './routes/etiquetas.routes';
import usersRoutes from './routes/users.routes';
import direccionesRoutes from './routes/direcciones.routes';
import ventasRoutes from './routes/ventas.routes';
import stockRoutes from './routes/stock.routes';
import carritoRoutes from './routes/carrito.routes';
import metodosEnvioRoutes from './routes/metodos-envio.routes';
import codigosDescuentoRoutes from './routes/codigos-descuento.routes';
import reportesRoutes from './routes/reportes.routes';
import webhooksRoutes from './routes/webhooks.routes';

const app = express();

// ─── Seguridad y parsers ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.ECOMMERCE_URL ?? 'http://localhost:3000',
    process.env.ADMIN_URL ?? 'http://localhost:3001',
  ],
  credentials: true,
}));

// El webhook de MercadoPago necesita el body raw para validar la firma
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Rutas API v1 ─────────────────────────────────────────────────────────────
const V1 = '/api/v1';

app.use(`${V1}/auth`, authRoutes);
app.use(`${V1}/productos`, productosRoutes);
app.use(`${V1}/categorias`, categoriasRoutes);
app.use(`${V1}/subcategorias`, subcategoriasRoutes);
app.use(`${V1}/marcas`, marcasRoutes);
app.use(`${V1}/presentaciones`, presentacionesRoutes);
app.use(`${V1}/origenes`, origenesRoutes);
app.use(`${V1}/proveedores`, proveedoresRoutes);
app.use(`${V1}/etiquetas`, etiquetasRoutes);
app.use(`${V1}/users`, usersRoutes);
app.use(`${V1}/direcciones`, direccionesRoutes);
app.use(`${V1}/ventas`, ventasRoutes);
app.use(`${V1}/stock`, stockRoutes);
app.use(`${V1}/carrito`, carritoRoutes);
app.use(`${V1}/metodos-envio`, metodosEnvioRoutes);
app.use(`${V1}/codigos-descuento`, codigosDescuentoRoutes);
app.use(`${V1}/reportes`, reportesRoutes);
app.use(`${V1}/webhooks`, webhooksRoutes);

// ─── Error handler global ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
