# Shop · Avance del proyecto

_Última actualización: 22 de octubre de 2026_

## 1. Resumen

Tienda en línea (e-commerce) construida con **Next.js**. Usa **Zustand** para el estado del cliente y **Redis** para caché y datos rápidos del servidor. No usa Tailwind: los estilos van con CSS Modules.

## 2. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router + Turbopack) | 16.4.2 |
| UI | React / React DOM | 19.3.0 |
| Lenguaje | TypeScript | ^5 |
| Estado del cliente | Zustand | ^5.0.16 |
| Caché / datos rápidos | redis (cliente oficial de Node) | ^6.3.0 |
| Protección de módulos de servidor | server-only | latest |
| Linter | ESLint + eslint-config-next | ^9 / 16.4.2 |
| Estilos | CSS Modules + `globals.css` | — |
| Runtime usado | Node.js / npm | 24.21.0 / 11.19.0 |

## 3. Lo que se ha realizado

### 3.1 Creación del proyecto

Se generó con `create-next-app` usando estas opciones:

```bash
npx create-next-app@latest shop --ts --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-npm --turbopack
```

- El proyecto quedó en `MCPS/Shop/shop`, porque npm no permite mayúsculas en el nombre del paquete (`Shop`).
- Tiene la carpeta `src/` y el alias de imports `@/*` → `src/*`.

### 3.2 Dependencias agregadas

```bash
npm install zustand redis server-only
```

### 3.3 Redis: `src/lib/redis.ts`

- `getRedis()` devuelve un cliente conectado y comparte **una sola conexión** en toda la app. La conexión se guarda en `globalThis` para que no se dupliquen conexiones con el HMR en desarrollo.
- Si la conexión falla, no queda guardada y se vuelve a intentar en la siguiente llamada.
- Lee la URL desde la variable `REDIS_URL` (por defecto `redis://localhost:6379`).
- Importa `server-only`, así que da error si se intenta usar desde un componente del cliente.

### 3.4 Zustand: `src/store/cart-store.ts`

Store `useCartStore` para el carrito del lado del cliente:

- Estado: `items: CartItem[]` (`id`, `name`, `price`, `quantity`).
- Acciones: `addItem` (si el producto ya está, suma 1 a la cantidad), `removeItem` y `clear`.
- Se guarda en `localStorage` con la clave `cart` (middleware `persist`).

### 3.5 Endpoint de salud: `src/app/api/health/route.ts`

- `GET /api/health` hace un `PING` a Redis.
- Respuestas: `200 { "redis": "PONG" }` o `503 { "redis": "unavailable", "error": "..." }`.
- Usa `await connection()` para que la ruta sea dinámica y no intente conectarse a Redis durante el build.

### 3.6 Variables de entorno

- `.env.example`: plantilla que se versiona.
- `.env.local`: copia local, que no se versiona.

```env
REDIS_URL=redis://localhost:6379
```

### 3.7 Verificación

- `npm run build` compila sin errores (TypeScript incluido).
- Rutas generadas: `/` (estática), `/_not-found` (estática) y `/api/health` (dinámica).

### 3.8 Carpeta `Documentación/`

Contiene este archivo y los scripts SQL de la base de datos:

| Archivo | Contenido |
|---|---|
| `ecommerce_schema.sql` | Esquema completo para **Supabase (PostgreSQL 15+)**: tipos enum, 17 tablas (perfiles, direcciones, categorías, marcas, productos, variantes, imágenes, inventario, carritos, wishlist, cupones, órdenes, pagos, reseñas…), índices (incluida búsqueda con `pg_trgm`), triggers, políticas RLS, las funciones `place_order` y `cancel_order`, y un bucket de Storage para imágenes. |
| `ecommerce_seed.sql` | Datos de ejemplo (categorías, marcas, productos, variantes, imágenes y cupones). Se ejecuta **después** del esquema. |

## 4. Estructura actual

```
shop/
├── Documentación/
│   ├── avance-del-proyecto.md
│   ├── ecommerce_schema.sql
│   └── ecommerce_seed.sql
├── public/
├── src/
│   ├── app/
│   │   ├── api/health/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.module.css
│   │   └── page.tsx
│   ├── lib/redis.ts
│   └── store/cart-store.ts
├── .env.example
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 5. Cómo ejecutar

1. Levantar un servidor Redis, por ejemplo con Docker:
   ```bash
   docker run -d -p 6379:6379 redis
   ```
   O poner en `.env.local` la URL de un Redis en la nube.
2. Iniciar el servidor de desarrollo:
   ```bash
   cd shop
   npm run dev
   ```
3. Comprobar en http://localhost:3000/api/health que la respuesta sea `{ "redis": "PONG" }`.

## 6. Pendientes / observaciones

- [ ] **Supabase todavía no está conectado a la app**: falta instalar `@supabase/supabase-js` / `@supabase/ssr`, agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y ejecutar los scripts SQL en el SQL Editor de Supabase.
- [ ] Decidir cómo se relaciona el carrito de Zustand (en `localStorage`) con las tablas `carts` / `cart_items` de la base de datos, por ejemplo sincronizándolos cuando el usuario inicia sesión.
- [ ] Definir para qué se usará Redis (caché de catálogo, sesiones, rate limiting, etc.).
- [ ] `npm audit` reporta 5 vulnerabilidades "high" en las dependencias de la plantilla. No se aplicó `npm audit fix --force` para no romper versiones.
- [ ] Reemplazar la página de inicio de la plantilla (`src/app/page.tsx`).
