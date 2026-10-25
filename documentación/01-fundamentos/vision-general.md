---
title: "Visión general del proyecto Shop (tienda Almacén)"
description: "Qué es el proyecto, qué vende, qué partes existen hoy en código, cuáles solo en diseño o SQL, y qué servicios externos usa."
keywords: ["visión", "alcance", "almacén", "e-commerce", "módulos", "estado", "supabase", "vercel", "github", "redis", "webpay", "flow"]
related: ["01-fundamentos/stack-y-versiones.md", "02-arquitectura/vision-de-arquitectura.md", "08-estado/avance.md"]
source: ["_archivo/avance-del-proyecto.md §1-§4", "_archivo/diseno-almacen.md §1", "package.json", ".mcp.json"]
estado: "vigente"
---

# Visión general del proyecto Shop

> **Úsalo cuando:** empiezas a trabajar en el proyecto y necesitas saber qué es, qué existe hoy y qué falta.

## Qué es

**Shop** es el repositorio de una tienda en línea para Chile. La marca y el diseño se llaman **Almacén**: una tienda de objetos para la casa (cerámica, textiles, velas y aromas, y cocina). El diseño busca que el cliente pueda hacer tres cosas: **encontrar el producto, entender cuánto cuesta y cuándo llega, y pagar sin dudas**.

- Mercado: Chile. Moneda: **CLP**, montos enteros. Idioma de la interfaz: **español de Chile**.
- Venta a personas (boleta) y a empresas (factura).
- Se puede comprar como invitado o con cuenta.
- Medios de pago: **Webpay Plus** (tarjetas), **Flow** (otros medios) y **transferencia bancaria** (el pedido queda reservado 48 h).
- Despacho con **Starken** a todo Chile continental, más retiro en la tienda Almacén Providencia.

## Estado por capa

| Capa | Estado | Dónde está |
|---|---|---|
| Proyecto Next.js 16.4 + React 19.3 | ✅ Creado. Idioma, fuentes y tokens de Almacén aplicados; portada provisoria | `src/app/` |
| Formatos chilenos (CLP, RUT, teléfono, fechas) | ✅ Implementados | `src/lib/format/` |
| Conexión a Redis (`getRedis`) | ✅ Implementada | `src/lib/redis.ts` |
| Carro en el cliente (Zustand + `localStorage`) | ✅ Versión mínima | `src/store/cart-store.ts` |
| Endpoint de salud `GET /api/health` | ✅ Implementado | `src/app/api/health/route.ts` |
| Esquema de base de datos (Supabase/PostgreSQL) | 📐 Escrito en SQL, **no conectado a la app** | `03-base-de-datos/sql/` |
| Design system, 40 templates y flujo de compra | 📐 Diseñados en artifacts de claude.ai, **sin portar** | [04-diseno/](../04-diseno/) |
| Pagos (Webpay Plus, Flow, transferencia) | 📐 Definidos en el diseño. Hay servidores MCP para probar, **sin código en la app** | [06-implementacion/](../06-implementacion/) |
| Autenticación, catálogo, checkout, cuenta | ⏳ Pendiente | [06-implementacion/hoja-de-ruta.md](../06-implementacion/hoja-de-ruta.md) |

Leyenda: ✅ implementado · 📐 definido (en diseño o SQL) pero sin código · ⏳ pendiente.

## Módulos funcionales

| Módulo | Qué cubre | Tablas principales | Pantallas |
|---|---|---|---|
| Catálogo | Categorías, marcas, productos, variantes, imágenes, búsqueda | `categories`, `brands`, `products`, `product_variants`, `product_images`, vista `product_catalog` | Inicio, Listado, Ficha, Sin resultados |
| Carro | Carro en el cliente y en la base de datos, favoritos | `carts`, `cart_items`, `wishlist_items` | Carro, drawer del carro, Carro vacío |
| Checkout | Contacto, despacho, pago, documento tributario | `orders`, `order_items`, `coupons`, `coupon_redemptions` | Checkout (+ estados) |
| Pagos | Webpay Plus, Flow, transferencia | `payments` | Procesando, Rechazado, Transferencia pendiente, Confirmación |
| Cuenta | Login, registro, direcciones, pedidos | `profiles`, `addresses`, `orders` | Ingresar, Mis pedidos, Detalle de pedido |
| Inventario | Stock por variante y movimientos | `product_variants.stock`, `inventory_movements` | Stock bajo / Sin stock en Ficha y Listado |
| Opiniones | Reseñas de compradores | `reviews` | Opiniones en la Ficha |
| Contenido | Páginas informativas (despacho, cambios) | — | Contenido, 404 |
| Administración | Rol `admin` en la base de datos | `profiles.role` | **Sin diseño** |

## Servicios externos

| Servicio | Para qué | Cómo lo usa un agente |
|---|---|---|
| **Supabase** (PostgreSQL, Auth, Storage) | Base de datos, usuarios, imágenes | MCP `supabase` (proyecto `nswchmyzgcutyehhuche`, ver `.mcp.json`) |
| **Vercel** | Hosting, Vercel Cron (`vercel.json`), DNS de `audazia.dev` | MCP `vercel` (plan Pro; la tienda aún no tiene proyecto creado) |
| **GitHub** | Repositorio `Luckillash/shop` (público, rama `main`) | MCP `github` (issues, PRs, ramas, commits) |
| **Redis** | Uso por definir. Hoy solo se usa en `/api/health` | `REDIS_URL` |
| **Transbank Webpay Plus** | Pago con tarjeta | MCP `transbank` (ambiente de integración) + documentación en `../transbank/documentación/` |
| **Flow** | Pago con otros medios | MCP `flow` (sandbox) + documentación en `../flow/documentación/` |
| **Starken** | Despacho | Sin integración. Solo aparece en los textos del diseño |

Ver [07-referencia/recursos-externos.md](../07-referencia/recursos-externos.md) para los enlaces y las rutas.
