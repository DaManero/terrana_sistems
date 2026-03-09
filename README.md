# Terrana — Sistema de Gestión y Ecommerce

> Documento de referencia técnica y arquitectónica del proyecto.
> **Actualizar este archivo ante cualquier decisión importante que se tome durante el desarrollo.**

---

## Descripción del Proyecto

Sistema integral para una empresa que comercializa productos alimenticios (aceite de oliva, aceitunas, pastas de aceitunas, acetos balsámicos, entre otros) tanto al por mayor como al por menor.

El sistema se compone de tres aplicaciones interconectadas:

| Aplicación  | Descripción                                                              |
| ----------- | ------------------------------------------------------------------------ |
| `backend`   | API REST centralizada. Lógica de negocio, autenticación, acceso a datos  |
| `ecommerce` | Tienda online para clientes (B2C y B2B) con pasarela de pagos            |
| `admin`     | Panel de administración interno para gestionar el negocio y el ecommerce |

---

## Stack Tecnológico

| Capa              | Tecnología        |
| ----------------- | ----------------- |
| Backend           | Node.js           |
| Frontend (ambos)  | Next.js           |
| Base de datos     | PostgreSQL        |
| UI Components     | Material UI (MUI) |
| Pasarela de pagos | MercadoPago       |
| Contenedores      | Docker            |
| Deploy            | Railway           |
| País de operación | Argentina         |

---

## Arquitectura del Proyecto

### Tipo de repositorio

**Monorepo simple** — un único repositorio Git que contiene los tres proyectos. Un solo `git push` actualiza todo.

### Estructura de carpetas

```
terrana/
├── backend/              ← API Node.js
│   ├── src/
│   └── Dockerfile
├── ecommerce/            ← Next.js tienda online
│   ├── src/
│   └── Dockerfile
├── admin/                ← Next.js panel de administración
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml    ← Orquestación para desarrollo local
├── .env.example          ← Variables de entorno requeridas (sin valores reales)
├── .gitignore
└── README.md
```

### Deploy en Railway

- El repositorio se conecta **una sola vez** a Railway.
- Se configuran **tres servicios** dentro del mismo proyecto Railway, cada uno apuntando a su subcarpeta.
- Railway detecta los cambios por carpeta y redespliega solo los servicios afectados.
- La base de datos **PostgreSQL es provista por Railway** como servicio gestionado.
- Las variables de entorno se configuran en Railway y se inyectan en los contenedores en producción.

### Docker

- Cada servicio tiene su propio `Dockerfile` optimizado para producción.
- `docker-compose.yml` en la raíz se usa **exclusivamente para desarrollo local**.
- En producción, Railway usa los `Dockerfile` individuales de cada servicio.

---

## Módulos del Sistema

### Backend

- Autenticación y autorización (JWT)
- Gestión de usuarios y roles (internos y clientes)
- Catálogo de productos
- Gestión de pedidos
- Stock e inventario
- CRM básico de clientes
- Reportes y estadísticas
- Integración con MercadoPago

### Ecommerce (tienda online)

- Catálogo público de productos con filtros y búsqueda
- Registro y login de clientes (propio, sin login social)
- **Precios diferenciados** según tipo de cuenta (minorista / mayorista)
- Carrito de compras
- Checkout con MercadoPago
- Historial de pedidos del cliente
- Perfil de cliente

### Admin (panel de administración)

- Gestión de productos y catálogo
- Gestión de pedidos
- CRM básico de clientes
- Aprobación manual de cuentas mayoristas
- Stock e inventario
- Reportes y estadísticas
- Gestión de usuarios y roles internos

---

## Tipos de Cliente (B2C / B2B)

| Tipo                 | Acceso a precios                | Alta de cuenta                                 |
| -------------------- | ------------------------------- | ---------------------------------------------- |
| **Invitado (guest)** | Precios de lista públicos       | No requiere cuenta — completa datos al comprar |
| **Minorista (B2C)**  | Precios de lista públicos       | Registro libre                                 |
| **Mayorista (B2B)**  | Precios diferenciados (menores) | Solicitud + aprobación manual por la empresa   |

### Compra minorista — Guest Checkout con registro opcional

Decisión adoptada: **Opción C — Guest checkout + registro opcional al finalizar.**

- El cliente puede comprar **sin crear cuenta**: completa nombre, email, teléfono y dirección de envío directamente en el checkout.
- Al confirmar el pago, el sistema le ofrece: _"¿Querés guardar tus datos para hacer seguimiento de tu pedido y comprar más rápido la próxima vez?"_
  - **Si acepta:** se crea la cuenta automáticamente con los datos ya ingresados (sin tener que reescribir nada). El pedido queda vinculado al nuevo usuario.
  - **Si no acepta:** la venta queda registrada con `cliente_id = null` y los datos del guest guardados directamente en la tabla `ventas`.
- En ambos casos el cliente recibe confirmación por email.
- Un cliente guest **no puede solicitar cuenta mayorista** hasta registrarse.

### Cuenta mayorista

- El cliente mayorista se registra normalmente pero queda en estado **pendiente** hasta que un administrador apruebe su cuenta.
- Hasta la aprobación, el cliente ve precios minoristas.
- Tras la aprobación, el sistema le muestra automáticamente los precios mayoristas.

---

## Variables de Entorno Requeridas

Las siguientes variables deben definirse en cada entorno (local en `.env`, producción en Railway):

```env
# Base de datos
DATABASE_URL=

# Autenticación
JWT_SECRET=
JWT_EXPIRES_IN=

# Email transaccional (recupero de contraseña, confirmaciones, etc.)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=           # ej: no-reply@terrana.com

# MercadoPago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=

# URLs de los servicios
BACKEND_URL=
ECOMMERCE_URL=
ADMIN_URL=

# Entorno
NODE_ENV=development | production
```

---

## Identidad Visual

### Color Principal

`#594d0e` — Oro Oliva (color del logo)

### Paleta de Colores

#### Primarios — Oro Oliva

Derivados del color principal, transmiten calidez, tierra y autenticidad.

| Nombre      | HEX       | Uso sugerido                                    |
| ----------- | --------- | ----------------------------------------------- |
| `olive-950` | `#2e2807` | Textos sobre fondos claros, encabezados fuertes |
| `olive-900` | `#594d0e` | ⭐ Color principal del logo y marca             |
| `olive-700` | `#7a6a14` | Botones primarios hover, estados activos        |
| `olive-500` | `#a08c22` | Botones primarios, links, highlights            |
| `olive-300` | `#c9b96a` | Bordes decorativos, iconos secundarios          |
| `olive-100` | `#ede8d0` | Fondos de cards, secciones destacadas           |
| `olive-50`  | `#f7f5ed` | Fondos de página, superficies sutiles           |

#### Neutros — Crema Cálida

Evitan el blanco/negro puro para mantener la calidez de la marca.

| Nombre        | HEX       | Uso sugerido                         |
| ------------- | --------- | ------------------------------------ |
| `neutral-900` | `#1c1a13` | Texto principal                      |
| `neutral-700` | `#4a4535` | Texto secundario, subtítulos         |
| `neutral-400` | `#9c9485` | Texto deshabilitado, placeholders    |
| `neutral-200` | `#d9d4c7` | Bordes, divisores                    |
| `neutral-100` | `#f0ede6` | Fondos alternativos                  |
| `neutral-50`  | `#fdfcf8` | Fondo base del sitio (blanco cálido) |

#### Acento — Verde Salvia

Complementa al oro oliva sin romper la delicadeza. Evoca el olivo, la naturaleza.

| Nombre     | HEX       | Uso sugerido                              |
| ---------- | --------- | ----------------------------------------- |
| `sage-700` | `#4a5c3f` | Badges, etiquetas premium                 |
| `sage-500` | `#6b8560` | Íconos de categorías, acentos secundarios |
| `sage-100` | `#dce8d8` | Fondos de badges, chips                   |

#### Colores Semánticos

| Estado      | HEX       | Uso                                 |
| ----------- | --------- | ----------------------------------- |
| Éxito       | `#4a7c59` | Pedido confirmado, stock disponible |
| Advertencia | `#b8860b` | Stock bajo, precio por vencer       |
| Error       | `#9b3a2f` | Errores, eliminaciones              |
| Info        | `#3a6b8a` | Notificaciones informativas         |

---

### Tipografía

#### Fuentes principales (Google Fonts)

| Rol            | Fuente                 | Peso          | Uso                                             |
| -------------- | ---------------------- | ------------- | ----------------------------------------------- |
| Display / Hero | **Cormorant Garamond** | 400, 600      | Títulos grandes, hero sections, nombre de marca |
| Headings       | **Playfair Display**   | 400, 700      | H1–H3, títulos de sección                       |
| Body / UI      | **Inter**              | 400, 500, 600 | Texto de párrafo, botones, labels, navegación   |

#### Escala tipográfica sugerida

| Nivel           | Fuente             | Tamaño  | Peso |
| --------------- | ------------------ | ------- | ---- |
| Display         | Cormorant Garamond | 56–72px | 400  |
| H1              | Playfair Display   | 40px    | 700  |
| H2              | Playfair Display   | 32px    | 700  |
| H3              | Playfair Display   | 24px    | 400  |
| Body Large      | Inter              | 18px    | 400  |
| Body            | Inter              | 16px    | 400  |
| Body Small      | Inter              | 14px    | 400  |
| Caption / Label | Inter              | 12px    | 500  |

#### Importar en Next.js (Google Fonts)

```ts
// app/layout.tsx
import { Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cormorant",
});
```

---

## Flujos de Negocio

### Flujo de un pedido (minorista — guest checkout)

1. El visitante navega el catálogo y agrega productos al carrito (carrito anónimo por `session_id`).
2. Inicia el checkout: completa nombre, email, teléfono y dirección de envío.
3. Selecciona método de envío y, opcionalmente, ingresa un código de descuento.
4. Paga mediante MercadoPago (o el método disponible).
5. Al confirmar el pago:
   - Se crea el registro en `ventas` con `cliente_id = null` y los campos `guest_*`.
   - Se descuenta el stock en `productos` y se registra el movimiento en `stock_movimientos`.
   - Se envía email de confirmación al `guest_email`.
6. **Registro opcional:** se le ofrece crear cuenta con los datos ya ingresados.
   - Si acepta: se crea el usuario **sin contraseña aún**, se vincula el pedido (`cliente_id` se actualiza) y se envía un email con un link para **establecer su contraseña** (token de un solo uso con vencimiento de 24 hs). El carrito anónimo se vacía.
   - Si no acepta: el pedido queda como guest.

### Flujo de un pedido (minorista — usuario registrado)

1. El cliente inicia sesión (el carrito anónimo se fusiona con el carrito de su cuenta si existía).
2. Selecciona una dirección guardada o ingresa una nueva.
3. Selecciona método de envío y aplica código de descuento (opcional).
4. Paga. Se registra la venta con `cliente_id` vinculado.
5. El cliente puede ver el historial del pedido en su perfil.

### Flujo de registro y aprobación de cuenta mayorista

1. El cliente se registra con una cuenta minorista (o ya tiene una).
2. Desde su perfil solicita acceso mayorista. Se crea un registro en `solicitudes_mayorista` con estado `pendiente`.
3. Un administrador revisa la solicitud desde el panel admin.
4. Si aprueba: se actualiza `users.aprobado = true` y `rol_id` al rol mayorista. El cliente ve precios mayoristas en su próximo login.
5. Si rechaza: se registra el motivo en `solicitudes_mayorista.mensaje_admin` y se notifica al cliente por email.

### Flujo de establecimiento de contraseña (post-registro guest)

1. Al aceptar crear cuenta tras una compra, el sistema genera un token único y lo guarda en `password_reset_tokens` con tipo `set_password` y vencimiento de **24 horas**.
2. Se envía un email al cliente con un link del tipo: `https://terrana.com/auth/set-password?token=<token>`.
3. El cliente hace clic, ingresa y confirma su contraseña.
4. El backend valida que el token exista, no esté usado y no haya vencido.
5. Se actualiza `users.password` con el hash de la nueva contraseña.
6. El token se marca como usado (`usado = true`). El cliente queda logueado automáticamente.

### Flujo de recupero de contraseña

1. El cliente hace clic en _"Olvidé mi contraseña"_ e ingresa su email.
2. Si el email existe en `users`, el sistema genera un token y lo guarda en `password_reset_tokens` con tipo `reset_password` y vencimiento de **1 hora**.
3. Se envía un email con el link: `https://terrana.com/auth/reset-password?token=<token>`.
4. El cliente ingresa y confirma la nueva contraseña.
5. El backend valida el token (existente, no usado, no vencido).
6. Se actualiza `users.password` con el hash. El token se marca como usado.
7. Se envía un email de confirmación notificando que la contraseña fue cambiada.

> **Nota de seguridad:** si el email no existe en la base de datos, el sistema **igual muestra el mensaje de éxito** ("Te enviamos un email si la cuenta existe") para no revelar qué emails están registrados.

### Flujo de pago con MercadoPago (webhooks y notificaciones)

**Modalidad elegida: Checkout Pro** — el cliente es redirigido a la página de pago de MercadoPago y vuelve al sitio al terminar. Es la opción más simple de integrar y la más conocida por los compradores argentinos.

**Flujo completo:**

1. El cliente confirma el pedido en el ecommerce.
2. El backend crea una **preferencia de pago** en la API de MercadoPago con los ítems, el monto total y las URLs de retorno.
3. MercadoPago devuelve un `preference_id` con una URL de pago.
4. El frontend redirige al cliente a esa URL (página de MP).
5. El cliente paga en MercadoPago (tarjeta, débito, efectivo, etc.).
6. MercadoPago redirige al cliente de vuelta al ecommerce según el resultado:
   - `ECOMMERCE_URL/checkout/success` — pago aprobado
   - `ECOMMERCE_URL/checkout/pending` — pago pendiente (ej: pago en efectivo)
   - `ECOMMERCE_URL/checkout/failure` — pago rechazado
7. **En paralelo**, MercadoPago envía una notificación **webhook** al backend (`BACKEND_URL/webhooks/mercadopago`) con el estado real del pago.
8. El backend valida la notificación, actualiza `ventas.pago_estado` y `ventas.mp_payment_id`, y descuenta el stock si el pago fue aprobado.

> **Importante:** el stock **no se descuenta al crear el pedido** sino al recibir la confirmación del pago por webhook. Esto evita reservar stock por pagos que nunca se completan.

**Estados posibles de `pago_estado`:** `pendiente` → `aprobado` / `rechazado` / `reembolsado`

---

## Roles y Permisos

### Modelo adoptado

**RBAC simple (Role-Based Access Control)** — los permisos están definidos directamente en el código del backend como middlewares de autorización. No se usa una tabla de permisos en la base de datos, ya que los roles son estables y no requieren configuración dinámica desde UI.

---

### Roles del sistema

| Rol                 | Dónde opera | Descripción                                                                            |
| ------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `admin`             | Admin       | Acceso total al sistema sin restricciones                                              |
| `operador`          | Admin       | Gestión operativa diaria: pedidos, stock, clientes. Sin acceso a configuración crítica |
| `cliente_mayorista` | Ecommerce   | Compra a precios diferenciados. Requiere aprobación previa                             |
| `cliente_minorista` | Ecommerce   | Compra a precios de lista públicos. Alta libre                                         |
| _(guest)_           | Ecommerce   | No tiene rol en DB. Se identifica por ausencia de JWT                                  |

---

### Matriz de permisos

| Módulo / Acción                  | Admin | Operador | Mayorista | Minorista |
| -------------------------------- | :---: | :------: | :-------: | :-------: |
| Ver catálogo público             |  ✅   |    ✅    |    ✅     |    ✅     |
| Ver precios mayoristas           |  ✅   |    ✅    |    ✅     |    ❌     |
| Crear / editar productos         |  ✅   |    ✅    |    ❌     |    ❌     |
| **Editar precios y costos**      |  ✅   |    ❌    |    ❌     |    ❌     |
| Eliminar productos               |  ✅   |    ❌    |    ❌     |    ❌     |
| Gestionar stock                  |  ✅   |    ✅    |    ❌     |    ❌     |
| Ver todas las ventas             |  ✅   |    ✅    |    ❌     |    ❌     |
| Ver sus propias ventas           |  ✅   |    ✅    |    ✅     |    ✅     |
| Gestionar métodos de envío       |  ✅   |    ❌    |    ❌     |    ❌     |
| Gestionar códigos de descuento   |  ✅   |    ❌    |    ❌     |    ❌     |
| Aprobar cuentas mayoristas       |  ✅   |    ✅    |    ❌     |    ❌     |
| Generar etiquetas de envío       |  ✅   |    ✅    |    ❌     |    ❌     |
| Ver reportes y estadísticas      |  ✅   |    ✅    |    ❌     |    ❌     |
| Gestionar usuarios internos      |  ✅   |    ❌    |    ❌     |    ❌     |
| Gestionar roles                  |  ✅   |    ❌    |    ❌     |    ❌     |
| Gestionar etiquetas / categorías |  ✅   |    ❌    |    ❌     |    ❌     |

> **Regla clave (Opción A):** el `operador` gestiona el día a día (pedidos, stock, clientes, envíos), pero **no puede tocar precios, costos, descuentos ni configuración del sistema**. Esas acciones son exclusivas del `admin`.

---

### Implementación en el backend

Los permisos se aplican como **middlewares de autorización** encadenados a las rutas de la API:

```js
// Ejemplo conceptual — backend/src/middlewares/auth.js
router.delete(
  "/productos/:id",
  autenticar,
  requiereRol("admin"),
  eliminarProducto,
);
router.patch(
  "/productos/:id",
  autenticar,
  requiereRol("admin", "operador"),
  editarProducto,
);
router.patch(
  "/productos/:id/precio",
  autenticar,
  requiereRol("admin"),
  editarPrecio,
);
router.get(
  "/ventas",
  autenticar,
  requiereRol("admin", "operador"),
  listarVentas,
);
router.get("/ventas/:id", autenticar, esOwnerOAdmin, verVenta);
```

- `autenticar` — valida el JWT y adjunta el usuario al request.
- `requiereRol(...roles)` — corta con 403 si el rol del usuario no está en la lista.
- `esOwnerOAdmin` — permite acceso si el recurso pertenece al usuario autenticado O si es admin/operador.

---

## Modelo de Datos

Base de datos **PostgreSQL**. A continuación se detallan todas las tablas con sus columnas, tipos sugeridos y relaciones.

---

### `roles`

Tabla de roles del sistema (para usuarios internos y clientes).

| Columna  | Tipo          | Descripción                                   |
| -------- | ------------- | --------------------------------------------- |
| `id`     | `SERIAL PK`   | Identificador único                           |
| `nombre` | `VARCHAR(50)` | Nombre del rol (ej: Admin, Operador, Cliente) |

**Valores esperados:** `Admin`, `Operador`, `Cliente Minorista`, `Cliente Mayorista`

---

### `users`

Usuarios del sistema (internos y clientes del ecommerce).

| Columna      | Tipo           | Descripción                                     |
| ------------ | -------------- | ----------------------------------------------- |
| `id`         | `SERIAL PK`    | Identificador único                             |
| `nombre`     | `VARCHAR(100)` | Nombre del usuario                              |
| `apellido`   | `VARCHAR(100)` | Apellido del usuario                            |
| `email`      | `VARCHAR(150)` | Email único, usado para login                   |
| `password`   | `VARCHAR(255)` | Contraseña hasheada                             |
| `cel`        | `VARCHAR(30)`  | Número de celular                               |
| `rol_id`     | `INT FK`       | Referencia a `roles.id`                         |
| `activo`     | `BOOLEAN`      | Si la cuenta está habilitada                    |
| `aprobado`   | `BOOLEAN`      | Aprobación manual (aplica a cuentas mayoristas) |
| `created_at` | `TIMESTAMP`    | Fecha de creación                               |
| `updated_at` | `TIMESTAMP`    | Fecha de última modificación                    |

**Relaciones:** `rol_id → roles.id`

---

### `categorias`

Categorías principales de productos.

| Columna  | Tipo           | Descripción            |
| -------- | -------------- | ---------------------- |
| `id`     | `SERIAL PK`    | Identificador único    |
| `nombre` | `VARCHAR(100)` | Nombre de la categoría |

**Ejemplos:** Aceites, Aceitunas, Pastas, Acetos, Condimentos

---

### `subcategorias`

Subcategorías, siempre asociadas a una categoría padre.

| Columna        | Tipo           | Descripción                  |
| -------------- | -------------- | ---------------------------- |
| `id`           | `SERIAL PK`    | Identificador único          |
| `nombre`       | `VARCHAR(100)` | Nombre de la subcategoría    |
| `categoria_id` | `INT FK`       | Referencia a `categorias.id` |

**Relaciones:** `categoria_id → categorias.id`

> Una subcategoría solo puede pertenecer a una categoría. En el form de carga de productos, las subcategorías se filtran según la categoría seleccionada.

---

### `marcas`

Marcas de los productos.

| Columna  | Tipo           | Descripción         |
| -------- | -------------- | ------------------- |
| `id`     | `SERIAL PK`    | Identificador único |
| `nombre` | `VARCHAR(100)` | Nombre de la marca  |

---

### `presentaciones`

Formatos o presentaciones del producto (tamaño, envase, unidad).

| Columna  | Tipo           | Descripción                    |
| -------- | -------------- | ------------------------------ |
| `id`     | `SERIAL PK`    | Identificador único            |
| `nombre` | `VARCHAR(100)` | Descripción de la presentación |

**Ejemplos:** Botella 250ml, Lata 500g, Frasco 1kg, Bidón 5L, Pack x6

---

### `origenes`

País o región de origen del producto.

| Columna  | Tipo           | Descripción                        |
| -------- | -------------- | ---------------------------------- |
| `id`     | `SERIAL PK`    | Identificador único                |
| `nombre` | `VARCHAR(100)` | Nombre del país o región de origen |

**Ejemplos:** Argentina, España, Italia, Grecia, Chile

---

### `proveedores`

Proveedores de los productos.

| Columna      | Tipo           | Descripción                      |
| ------------ | -------------- | -------------------------------- |
| `id`         | `SERIAL PK`    | Identificador único              |
| `nombre`     | `VARCHAR(150)` | Razón social o nombre comercial  |
| `contacto`   | `VARCHAR(100)` | Nombre de la persona de contacto |
| `email`      | `VARCHAR(150)` | Email de contacto                |
| `telefono`   | `VARCHAR(30)`  | Teléfono de contacto             |
| `direccion`  | `TEXT`         | Dirección                        |
| `notas`      | `TEXT`         | Observaciones adicionales        |
| `activo`     | `BOOLEAN`      | Si el proveedor está activo      |
| `created_at` | `TIMESTAMP`    | Fecha de creación                |

---

### `productos`

Catálogo de productos.

| Columna            | Tipo            | Descripción                                   |
| ------------------ | --------------- | --------------------------------------------- |
| `id`               | `SERIAL PK`     | Identificador único                           |
| `nombre`           | `VARCHAR(200)`  | Nombre del producto                           |
| `descripcion`      | `TEXT`          | Descripción detallada                         |
| `uso_recomendado`  | `TEXT`          | Sugerencias de uso o recetas                  |
| `categoria_id`     | `INT FK`        | Referencia a `categorias.id`                  |
| `subcategoria_id`  | `INT FK`        | Referencia a `subcategorias.id`               |
| `marca_id`         | `INT FK`        | Referencia a `marcas.id`                      |
| `presentacion_id`  | `INT FK`        | Referencia a `presentaciones.id`              |
| `origen_id`        | `INT FK`        | Referencia a `origenes.id`                    |
| `proveedor_id`     | `INT FK`        | Referencia a `proveedores.id`                 |
| `costo`            | `NUMERIC(12,2)` | Precio de costo (no visible en ecommerce)     |
| `precio_venta_may` | `NUMERIC(12,2)` | Precio mayorista                              |
| `precio_venta_min` | `NUMERIC(12,2)` | Precio minorista (público)                    |
| `precio_promo`     | `NUMERIC(12,2)` | Precio de promoción (nullable)                |
| `stock`            | `INT`           | Unidades disponibles                          |
| `imagen_url`       | `TEXT`          | Link de imagen (Google Drive u otro servicio) |
| `activo`           | `BOOLEAN`       | Si el producto está publicado                 |
| `created_at`       | `TIMESTAMP`     | Fecha de creación                             |
| `updated_at`       | `TIMESTAMP`     | Fecha de última modificación                  |

**Relaciones:**

- `categoria_id → categorias.id`
- `subcategoria_id → subcategorias.id`
- `marca_id → marcas.id`
- `presentacion_id → presentaciones.id`
- `origen_id → origenes.id`
- `proveedor_id → proveedores.id`

> **Nota sobre imágenes:** por ahora se guarda el link directo de Google Drive. Queda pendiente definir si se migrará a Cloudinary, S3 u otro servicio de almacenamiento.

---

### `ventas`

Cabecera de cada venta / pedido.

| Columna               | Tipo            | Descripción                                                                  |
| --------------------- | --------------- | ---------------------------------------------------------------------------- |
| `id`                  | `SERIAL PK`     | Identificador único                                                          |
| `numero_pedido`       | `VARCHAR(20)`   | Número legible del pedido (ej: TRR-00123)                                    |
| `cliente_id`          | `INT FK`        | Referencia a `users.id` — **nullable** (null si es compra guest)             |
| `guest_nombre`        | `VARCHAR(150)`  | Nombre completo del comprador guest (nullable, solo si `cliente_id` es null) |
| `guest_email`         | `VARCHAR(150)`  | Email del guest para notificaciones (nullable, solo si `cliente_id` es null) |
| `guest_telefono`      | `VARCHAR(30)`   | Teléfono del guest (nullable)                                                |
| `fecha`               | `TIMESTAMP`     | Fecha y hora del pedido                                                      |
| `estado`              | `VARCHAR(30)`   | Estado del pedido (ver valores abajo)                                        |
| `canal`               | `VARCHAR(30)`   | Origen del pedido: `ecommerce`, `admin` (carga manual), `whatsapp`, etc.     |
| `tipo_cliente`        | `VARCHAR(20)`   | `minorista` / `mayorista`                                                    |
| `subtotal`            | `NUMERIC(12,2)` | Suma de ítems sin descuentos ni envío                                        |
| `descuento`           | `NUMERIC(12,2)` | Monto total de descuento aplicado                                            |
| `costo_envio`         | `NUMERIC(12,2)` | Costo de envío                                                               |
| `total`               | `NUMERIC(12,2)` | Total final del pedido                                                       |
| `metodo_pago`         | `VARCHAR(50)`   | Método de pago (ej: MercadoPago, transferencia, efectivo)                    |
| `pago_estado`         | `VARCHAR(30)`   | Estado del pago: `pendiente`, `aprobado`, `rechazado`, `reembolsado`         |
| `mp_payment_id`       | `VARCHAR(100)`  | ID de pago en MercadoPago (nullable, solo si aplica)                         |
| `metodo_envio_id`     | `INT FK`        | Referencia a `metodos_envio.id`                                              |
| `direccion_id`        | `INT FK`        | Referencia a `direcciones.id` (nullable si es retiro en local)               |
| `domicilio_envio`     | `TEXT`          | Snapshot de la dirección al momento del pedido                               |
| `codigo_descuento_id` | `INT FK`        | Referencia a `codigos_descuento.id` (nullable)                               |
| `notas`               | `TEXT`          | Observaciones del cliente o del operador                                     |
| `creado_por`          | `INT FK`        | Referencia a `users.id` (si la cargó un operador desde el admin)             |
| `created_at`          | `TIMESTAMP`     | Fecha de creación del registro                                               |
| `updated_at`          | `TIMESTAMP`     | Fecha de última modificación                                                 |

**Estados del pedido sugeridos:** `pendiente`, `confirmado`, `en_preparacion`, `despachado`, `entregado`, `cancelado`

**Relaciones:**

- `cliente_id → users.id`
- `metodo_envio_id → metodos_envio.id`
- `direccion_id → direcciones.id`
- `codigo_descuento_id → codigos_descuento.id`
- `creado_por → users.id`

---

### `venta_items`

Detalle de los productos incluidos en cada venta.

| Columna           | Tipo            | Descripción                                             |
| ----------------- | --------------- | ------------------------------------------------------- |
| `id`              | `SERIAL PK`     | Identificador único                                     |
| `venta_id`        | `INT FK`        | Referencia a `ventas.id`                                |
| `producto_id`     | `INT FK`        | Referencia a `productos.id`                             |
| `cantidad`        | `INT`           | Cantidad comprada                                       |
| `precio_unitario` | `NUMERIC(12,2)` | Precio al momento de la compra (snapshot, no el actual) |
| `subtotal`        | `NUMERIC(12,2)` | `cantidad × precio_unitario`                            |

**Relaciones:**

- `venta_id → ventas.id`
- `producto_id → productos.id`

> El `precio_unitario` se guarda como snapshot para preservar el precio histórico, independientemente de cambios futuros en el producto.

---

### `direcciones`

Direcciones de envío guardadas por cada cliente. Permite que el cliente tenga múltiples direcciones y reutilizarlas en futuros pedidos.

| Columna          | Tipo           | Descripción                                      |
| ---------------- | -------------- | ------------------------------------------------ |
| `id`             | `SERIAL PK`    | Identificador único                              |
| `usuario_id`     | `INT FK`       | Referencia a `users.id`                          |
| `alias`          | `VARCHAR(80)`  | Nombre descriptivo (ej: "Casa", "Trabajo")       |
| `calle`          | `VARCHAR(150)` | Calle y número                                   |
| `piso_depto`     | `VARCHAR(50)`  | Piso / departamento (nullable)                   |
| `localidad`      | `VARCHAR(100)` | Localidad o ciudad                               |
| `provincia`      | `VARCHAR(100)` | Provincia                                        |
| `codigo_postal`  | `VARCHAR(10)`  | Código postal                                    |
| `pais`           | `VARCHAR(60)`  | País (default: Argentina)                        |
| `telefono`       | `VARCHAR(30)`  | Teléfono de contacto en esa dirección (nullable) |
| `predeterminada` | `BOOLEAN`      | Si es la dirección por defecto del cliente       |
| `created_at`     | `TIMESTAMP`    | Fecha de creación                                |

**Relaciones:** `usuario_id → users.id`

> El campo `domicilio_envio` en `ventas` se reemplaza por una FK `direccion_id → direcciones.id`. Se guarda también un snapshot en texto por si la dirección cambia en el futuro.

---

### `stock_movimientos`

Trazabilidad completa de cada cambio en el stock de un producto. Permite auditar por qué el stock llegó a determinado valor.

| Columna         | Tipo          | Descripción                                                        |
| --------------- | ------------- | ------------------------------------------------------------------ |
| `id`            | `SERIAL PK`   | Identificador único                                                |
| `producto_id`   | `INT FK`      | Referencia a `productos.id`                                        |
| `tipo`          | `VARCHAR(30)` | Tipo de movimiento (ver valores abajo)                             |
| `cantidad`      | `INT`         | Cantidad movida (positivo = entrada, negativo = salida)            |
| `stock_antes`   | `INT`         | Stock antes del movimiento (snapshot)                              |
| `stock_despues` | `INT`         | Stock después del movimiento (snapshot)                            |
| `referencia_id` | `INT`         | ID del registro origen (nullable: `ventas.id`, `compras.id`, etc.) |
| `motivo`        | `TEXT`        | Descripción libre del motivo (para ajustes manuales)               |
| `usuario_id`    | `INT FK`      | Usuario que generó el movimiento                                   |
| `created_at`    | `TIMESTAMP`   | Fecha del movimiento                                               |

**Tipos de movimiento:** `venta`, `devolucion`, `ajuste_manual`, `ingreso_compra`, `merma`, `inicial`

**Relaciones:**

- `producto_id → productos.id`
- `usuario_id → users.id`

---

### `carrito`

Carrito de compras persistido por sesión o usuario. Permite recuperar el carrito si el cliente cierra el navegador.

| Columna      | Tipo           | Descripción                                                         |
| ------------ | -------------- | ------------------------------------------------------------------- |
| `id`         | `SERIAL PK`    | Identificador único                                                 |
| `usuario_id` | `INT FK`       | Referencia a `users.id` (nullable si el visitante no está logueado) |
| `session_id` | `VARCHAR(100)` | ID de sesión anónima (para visitantes sin cuenta)                   |
| `created_at` | `TIMESTAMP`    | Fecha de creación                                                   |
| `updated_at` | `TIMESTAMP`    | Última modificación (útil para expirar carritos viejos)             |

**Relaciones:** `usuario_id → users.id`

---

### `carrito_items`

Productos dentro de un carrito.

| Columna       | Tipo        | Descripción                       |
| ------------- | ----------- | --------------------------------- |
| `id`          | `SERIAL PK` | Identificador único               |
| `carrito_id`  | `INT FK`    | Referencia a `carrito.id`         |
| `producto_id` | `INT FK`    | Referencia a `productos.id`       |
| `cantidad`    | `INT`       | Cantidad seleccionada             |
| `created_at`  | `TIMESTAMP` | Fecha en que se agregó al carrito |

**Relaciones:**

- `carrito_id → carrito.id`
- `producto_id → productos.id`

---

### `solicitudes_mayorista`

Historial del proceso de aprobación de cuentas mayoristas. Deja trazabilidad de quién solicitó, cuándo, y quién aprobó o rechazó.

| Columna           | Tipo          | Descripción                                                    |
| ----------------- | ------------- | -------------------------------------------------------------- |
| `id`              | `SERIAL PK`   | Identificador único                                            |
| `usuario_id`      | `INT FK`      | Referencia a `users.id` (cliente solicitante)                  |
| `estado`          | `VARCHAR(20)` | Estado: `pendiente`, `aprobada`, `rechazada`                   |
| `mensaje_cliente` | `TEXT`        | Mensaje o datos adicionales enviados por el cliente (nullable) |
| `mensaje_admin`   | `TEXT`        | Motivo de aprobación o rechazo por parte del admin (nullable)  |
| `revisado_por`    | `INT FK`      | Referencia a `users.id` (admin que tomó la decisión)           |
| `created_at`      | `TIMESTAMP`   | Fecha de la solicitud                                          |
| `updated_at`      | `TIMESTAMP`   | Fecha de la última actualización                               |

**Relaciones:**

- `usuario_id → users.id`
- `revisado_por → users.id`

---

### `codigos_descuento`

Cupones y códigos promocionales aplicables en el checkout.

| Columna            | Tipo            | Descripción                                            |
| ------------------ | --------------- | ------------------------------------------------------ |
| `id`               | `SERIAL PK`     | Identificador único                                    |
| `codigo`           | `VARCHAR(50)`   | Código único que ingresa el cliente                    |
| `tipo`             | `VARCHAR(20)`   | `porcentaje` / `monto_fijo`                            |
| `valor`            | `NUMERIC(10,2)` | Valor del descuento (% o $ según tipo)                 |
| `minimo_compra`    | `NUMERIC(12,2)` | Monto mínimo de compra para aplicar (nullable)         |
| `usos_maximos`     | `INT`           | Cantidad máxima de usos totales (nullable = ilimitado) |
| `usos_por_usuario` | `INT`           | Usos máximos por usuario (nullable = ilimitado)        |
| `usos_actuales`    | `INT`           | Contador de usos realizados                            |
| `aplica_a`         | `VARCHAR(20)`   | `todos`, `minoristas`, `mayoristas`                    |
| `valido_desde`     | `TIMESTAMP`     | Fecha de inicio de validez                             |
| `valido_hasta`     | `TIMESTAMP`     | Fecha de vencimiento (nullable = sin vencimiento)      |
| `activo`           | `BOOLEAN`       | Si el código está habilitado                           |
| `created_at`       | `TIMESTAMP`     | Fecha de creación                                      |

---

### `metodos_envio`

Opciones de envío disponibles con sus costos y condiciones.

| Columna        | Tipo            | Descripción                                                     |
| -------------- | --------------- | --------------------------------------------------------------- |
| `id`           | `SERIAL PK`     | Identificador único                                             |
| `nombre`       | `VARCHAR(100)`  | Nombre del método (ej: "Retiro en el local", "Moto")            |
| `descripcion`  | `TEXT`          | Detalle adicional visible al cliente                            |
| `costo`        | `NUMERIC(10,2)` | Costo base del envío                                            |
| `gratis_desde` | `NUMERIC(12,2)` | Monto de compra a partir del cual el envío es gratis (nullable) |
| `activo`       | `BOOLEAN`       | Si el método está disponible                                    |

---

### `etiquetas`

Tags o etiquetas para enriquecer el catálogo y los filtros del ecommerce.

| Columna  | Tipo          | Descripción                              |
| -------- | ------------- | ---------------------------------------- |
| `id`     | `SERIAL PK`   | Identificador único                      |
| `nombre` | `VARCHAR(80)` | Nombre de la etiqueta                    |
| `slug`   | `VARCHAR(80)` | Versión URL-friendly (ej: `sin-tacc`)    |
| `color`  | `VARCHAR(7)`  | Color HEX para mostrar el badge en la UI |

**Ejemplos:** Sin TACC, Orgánico, Nuevo, Más vendido, Oferta, Sin stock, Importado

---

### `producto_etiquetas`

Relación muchos a muchos entre productos y etiquetas.

| Columna       | Tipo     | Descripción                 |
| ------------- | -------- | --------------------------- |
| `producto_id` | `INT FK` | Referencia a `productos.id` |
| `etiqueta_id` | `INT FK` | Referencia a `etiquetas.id` |

**PK compuesta:** `(producto_id, etiqueta_id)`

---

### `etiquetas_envio`

Registro de cada etiqueta de envío generada en PDF. No almacena el PDF en sí (se genera on-demand), sino el historial operativo de generación e impresión.

El PDF se construye tomando los datos de `ventas` + `direcciones` + `users` + `metodos_envio`, por lo que no se necesita guardar contenido extra.

| Columna        | Tipo        | Descripción                                                     |
| -------------- | ----------- | --------------------------------------------------------------- |
| `id`           | `SERIAL PK` | Identificador único                                             |
| `venta_id`     | `INT FK`    | Referencia a `ventas.id`                                        |
| `generada_por` | `INT FK`    | Referencia a `users.id` (operador que generó la etiqueta)       |
| `generada_at`  | `TIMESTAMP` | Fecha y hora de generación                                      |
| `impresa`      | `BOOLEAN`   | Si fue enviada a imprimir                                       |
| `impresa_por`  | `INT FK`    | Referencia a `users.id` (nullable, quien confirmó la impresión) |
| `impresa_at`   | `TIMESTAMP` | Fecha y hora de impresión (nullable)                            |
| `copias`       | `INT`       | Cantidad de copias impresas (default: 1)                        |
| `notas`        | `TEXT`      | Observaciones internas (nullable)                               |

**Relaciones:**

- `venta_id → ventas.id`
- `generada_por → users.id`
- `impresa_por → users.id`

> Una misma venta puede tener más de un registro si se reimprimió la etiqueta. Esto permite detectar reimpresiones y justificarlas con una nota.

---

### `password_reset_tokens`

Tokens temporales de un solo uso para dos casos: establecer contraseña al registrarse post-compra, y recuperar contraseña olvidada.

| Columna      | Tipo           | Descripción                                                                |
| ------------ | -------------- | -------------------------------------------------------------------------- |
| `id`         | `SERIAL PK`    | Identificador único                                                        |
| `usuario_id` | `INT FK`       | Referencia a `users.id`                                                    |
| `token`      | `VARCHAR(255)` | Token único generado (hash aleatorio seguro)                               |
| `tipo`       | `VARCHAR(20)`  | `set_password` (registro post-compra) / `reset_password` (recupero)        |
| `usado`      | `BOOLEAN`      | Si el token ya fue utilizado (default: false)                              |
| `expira_at`  | `TIMESTAMP`    | Fecha y hora de vencimiento (24 hs para `set_password`, 1 hs para `reset`) |
| `created_at` | `TIMESTAMP`    | Fecha de creación                                                          |

**Relaciones:** `usuario_id → users.id`

> Un usuario puede tener múltiples tokens (ej: solicitó recupero dos veces). Solo el más reciente y no vencido es válido.

---

### Diagrama de relaciones (resumen)

```
roles ──────────────── users ──────────── direcciones
                         │    └─────────── password_reset_tokens
                         ├──────────────── solicitudes_mayorista
                         │
                         ├──────────────── carrito ──── carrito_items ──── productos
                         │                                                      │
ventas ──────────────────┘                                  ┌──────────────────┤
  │   │                                                     │      ┌───────────┤
  │   └── codigos_descuento               etiquetas ────────┤   presentaciones │
  │                                    (producto_etiquetas) │              origenes
  │── venta_items ──────────────── productos ───── categorias
  │                                    │    \──── subcategorias
  │── metodos_envio                    │    \──── marcas
  │                                    │    \──── proveedores
  │                                    │
  │                           stock_movimientos
  │
  └── etiquetas_envio
```

---

## ORM y Migraciones

### ORM elegido: Prisma

**Prisma** es la capa entre el backend y PostgreSQL. Evita escribir SQL manual para las operaciones cotidianas y genera un cliente con tipado completo a partir del schema, lo que permite detectar errores en tiempo de desarrollo.

Las tres piezas que se usan en este proyecto:

| Pieza           | Descripción                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `schema.prisma` | Fuente de verdad de toda la estructura de la DB. Define tablas, columnas, tipos y relaciones |
| Prisma Migrate  | Genera y aplica archivos SQL de migración automáticamente al modificar el schema             |
| Prisma Client   | Cliente autogenerado con tipado completo para hacer queries desde el código                  |

---

### Ubicación del schema

El schema y las migraciones viven únicamente en el `backend`. Los frontends nunca acceden a la DB directamente.

```
backend/
└── prisma/
    ├── schema.prisma       ← definición de todas las tablas
    └── migrations/         ← historial de migraciones generadas automáticamente
        ├── 20260101_init/
        ├── 20260215_add_etiquetas/
        └── ...
```

---

### Comandos principales

```bash
# Crear una migración nueva tras modificar el schema (desarrollo)
npx prisma migrate dev --name descripcion_del_cambio

# Aplicar migraciones pendientes en producción (Railway lo ejecuta en el deploy)
npx prisma migrate deploy

# Introspeccionar la DB (solo si se parte de una DB existente)
npx prisma db pull

# Abrir Prisma Studio (interfaz visual para explorar la DB en desarrollo)
npx prisma studio
```

---

### Estrategia de migraciones por entorno

| Entorno                  | Cómo se aplican las migraciones                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Local**                | `prisma migrate dev` — crea la migración y la aplica automáticamente                                |
| **Producción (Railway)** | `prisma migrate deploy` se ejecuta como parte del proceso de deploy (antes de levantar el servidor) |

En el `Dockerfile` del backend, el comando de inicio incluye la migración antes de arrancar el servidor:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

Así cada deploy en Railway aplica automáticamente cualquier migración pendiente antes de que el servidor empiece a recibir tráfico.

---

### Queries de ejemplo para este proyecto

```js
// Buscar productos con filtros, paginación y relaciones
const productos = await prisma.producto.findMany({
  where: {
    categoria_id: 3,
    activo: true,
    stock: { gt: 0 },
    nombre: { contains: "aceite", mode: "insensitive" },
  },
  include: { marca: true, categoria: true, presentacion: true },
  orderBy: { precio_venta_min: "asc" },
  take: 20,
  skip: 0,
});

// Ventas del mes con total agrupado por canal
const reporte = await prisma.venta.groupBy({
  by: ["canal"],
  _sum: { total: true },
  _count: { id: true },
  where: { created_at: { gte: new Date("2026-03-01") } },
});

// SQL crudo para casos donde Prisma no alcanza
const resultado = await prisma.$queryRaw`
  SELECT p.nombre, SUM(vi.cantidad) as total_vendido
  FROM venta_items vi
  JOIN productos p ON vi.producto_id = p.id
  GROUP BY p.id
  ORDER BY total_vendido DESC
  LIMIT 10
`;
```

---

## Gestión de Imágenes de Productos

**Estrategia actual: links de Google Drive**

Las imágenes se almacenan en una carpeta de Google Drive gestionada manualmente. El campo `imagen_url` en la tabla `productos` guarda el link directo de visualización.

**Cómo obtener el link directo desde Google Drive:**

1. Subir la imagen a Google Drive y compartirla como _"cualquier persona con el link puede ver"_.
2. El link de compartir tiene el formato: `https://drive.google.com/file/d/FILE_ID/view`
3. Convertirlo al formato de visualización directa: `https://drive.google.com/uc?export=view&id=FILE_ID`
4. Ese segundo link es el que se guarda en `imagen_url` y el que usa el frontend para mostrar la imagen.

**Limitaciones conocidas:**

- Google Drive puede aplicar límites de visualización si la imagen recibe muchas visitas en poco tiempo.
- No permite transformaciones de imagen (redimensionar, comprimir, convertir formato) desde la URL.
- La disponibilidad depende de que el archivo permanezca compartido y sin mover.

**Migración futura:** cuando el catálogo crezca o las limitaciones sean un problema, migrar a **Cloudinary** (tiene plan gratuito generoso y permite transformaciones por URL). El cambio solo implica actualizar los valores de `imagen_url` en la DB, no la estructura de la tabla.

---

## Guía de Inicio Rápido (Local)

### Requisitos previos

- [Node.js](https://nodejs.org/) >= 20
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para levantar PostgreSQL)
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo> terrana
cd terrana

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores reales (JWT_SECRET, SMTP, MP, etc.)

# 3. Levantar la base de datos con Docker
docker-compose up postgres -d

# 4. Instalar dependencias del backend
cd backend
npm install

# 5. Generar el cliente de Prisma
npm run db:generate

# 6. Aplicar migraciones (crea todas las tablas)
npm run db:migrate
# Ingresar un nombre descriptivo cuando lo pida, ej: init

# 7. Cargar datos iniciales (roles, admin, categorías, etc.)
npx prisma db seed

# 8. Levantar el backend en modo desarrollo
npm run dev
# → Backend corriendo en http://localhost:4000
# → Health check: GET http://localhost:4000/health

# 9. (Opcional) Abrir Prisma Studio para explorar la DB visualmente
npm run db:studio
```

### Credenciales del seed

| Campo    | Valor               |
| -------- | ------------------- |
| Email    | `admin@terrana.com` |
| Password | `admin1234`         |

> **⚠️ Cambiar la contraseña del admin después del primer login.**

---

## Convenciones y Decisiones Técnicas

- **Idioma del código**: inglés (variables, funciones, nombres de archivos)
- **Idioma de la UI y contenidos**: español
- **Idioma de comentarios y documentación**: español
- La API REST del backend es consumida por **ambos frontends**
- Los `Dockerfile` están optimizados para producción (multi-stage builds recomendados)
- Las migraciones de base de datos se gestionan desde el `backend`
- Los secretos y credenciales **nunca se commitean** al repositorio

---

## Estructura Interna de los Servicios

Cada servicio del monorepo sigue la misma organización interna. Patrón: **Routes → Controllers → Services → Prisma**.

```
backend/src/
├── routes/          ← define los endpoints y aplica middlewares
│   ├── productos.routes.ts
│   ├── ventas.routes.ts
│   └── ...
├── controllers/     ← recibe el request, llama al service, devuelve la respuesta HTTP
│   ├── productos.controller.ts
│   ├── ventas.controller.ts
│   └── ...
├── services/        ← lógica de negocio pura, llama a Prisma
│   ├── productos.service.ts
│   ├── ventas.service.ts
│   └── ...
├── middlewares/     ← autenticación, autorización, validación, manejo de errores
│   ├── auth.middleware.ts
│   ├── roles.middleware.ts
│   └── error.middleware.ts
├── prisma/          ← instancia del Prisma Client (singleton)
│   └── client.ts
├── utils/           ← funciones auxiliares reutilizables
│   ├── email.ts
│   ├── tokens.ts
│   └── ...
├── types/           ← tipos e interfaces TypeScript compartidos
└── app.ts           ← configuración de Express y registro de rutas
```

```
ecommerce/src/
├── app/             ← Next.js App Router (páginas y layouts)
│   ├── (public)/    ← rutas públicas: catálogo, producto, checkout
│   └── (auth)/      ← rutas de autenticación: login, registro
├── components/      ← componentes React reutilizables
│   ├── ui/          ← componentes base (botones, inputs, modales)
│   └── features/    ← componentes de negocio (ProductCard, Cart, etc.)
├── lib/             ← clientes de API, helpers
├── hooks/           ← custom React hooks
├── store/           ← estado global (carrito, usuario)
└── types/           ← tipos TypeScript compartidos
```

> El `admin` sigue la misma estructura que `ecommerce` pero con rutas protegidas por rol.

---

## Política de Versionado de la API

Todas las rutas del backend incluyen el prefijo de versión en la URL:

```
GET  /api/v1/productos
POST /api/v1/ventas
GET  /api/v1/users/:id
```

- La versión actual es **`v1`**.
- Si en el futuro se necesita romper compatibilidad, se agrega `/api/v2/...` sin eliminar la v1 hasta migrar todos los clientes.
- Los frontends siempre consumen una versión explícita, nunca una URL sin versionar.

---

## Convención de Ramas y Commits

### Estrategia de ramas (Opción B — un repositorio, dos ramas)

```
repositorio: terrana  (único)
  ├── main     ← producción — Railway escucha esta rama y despliega automáticamente
  └── develop  ← desarrollo del día a día — Railway no reacciona a esta rama
```

**Regla fundamental:** nunca se commitea directamente en `main`. Todo el trabajo va a `develop`. Cuando una funcionalidad está lista y probada, se hace merge a `main` para publicar.

### Flujo diario

```bash
# Todo el trabajo en develop
git checkout develop
git add .
git commit -m "feat: agrego listado de productos con filtros"
git push

# Cuando se quiere publicar a producción
git checkout main
git merge develop
git push          ← Railway detecta el push y despliega automáticamente
git checkout develop  ← volver a develop para seguir trabajando
```

### Formato de mensajes de commit

Se usa **Conventional Commits** — un prefijo estándar que describe el tipo de cambio:

| Prefijo     | Cuándo usarlo                                  |
| ----------- | ---------------------------------------------- |
| `feat:`     | Nueva funcionalidad                            |
| `fix:`      | Corrección de un bug                           |
| `refactor:` | Cambio de código que no agrega ni corrige nada |
| `style:`    | Cambios de formato, estilos CSS (sin lógica)   |
| `docs:`     | Cambios en documentación o README              |
| `chore:`    | Tareas de mantenimiento (dependencias, config) |
| `hotfix:`   | Corrección urgente directo en producción       |

**Ejemplos reales:**

```bash
git commit -m "feat: agrego checkout con MercadoPago"
git commit -m "fix: corrijo cálculo de descuento en venta"
git commit -m "refactor: extraigo lógica de stock a service propio"
git commit -m "docs: actualizo README con flujo de pedidos"
git commit -m "chore: actualizo dependencias de Prisma a v6"
```

### Caso especial — hotfix en producción

Si hay un bug crítico en producción que no puede esperar:

```bash
git checkout main
git commit -m "hotfix: corrijo error en webhook de MercadoPago"
git push                  ← Railway despliega el fix
git checkout develop
git merge main            ← traer el fix también a develop
```

---

## Pendientes / A Definir

- [x] Flujos de negocio (pedido, mayorista, pagos)
- [x] Roles y permisos detallados
- [x] Modelo de datos completo (tablas y relaciones de PostgreSQL)
- [x] Confirmar ORM (Prisma recomendado) y estrategia de migraciones
- [x] Servicio de almacenamiento de imágenes de productos
- [x] Guía de inicio rápido para desarrollo local
- [x] Convención de ramas y commits
- [x] Estructura interna detallada de cada servicio (carpetas, módulos, rutas)
- [x] Política de versionado de la API
- [ ] Estrategia de testing (unitario, integración, e2e)
- [ ] Configuración de CI/CD

---

_Última actualización: marzo 2026_
