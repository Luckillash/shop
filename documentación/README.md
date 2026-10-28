---
title: "Shop (tienda Almacén): índice de documentación para agentes"
description: "Punto de entrada. Resume las invariantes del proyecto y enruta cada tarea al archivo que hay que leer: fundamentos, arquitectura, base de datos, diseño, dominio, implementación, referencia y estado."
generated: "2026-10-23"
stack: "Next.js 16.4.2 · React 19.3 · TypeScript · Zustand 5 · Redis 6 · Supabase (PostgreSQL 15+)"
sources: ["_archivo/avance-del-proyecto.md", "_archivo/diseno-almacen.md", "03-base-de-datos/sql/", "src/", "../flow/documentación/", "../transbank/documentación/"]
---

# Shop: índice de documentación (orientado a agentes)

Base de conocimiento del proyecto **Shop**, una tienda en línea chilena con el diseño **Almacén** (objetos para la casa). Cubre el stack y las convenciones, la arquitectura, la base de datos de Supabase, el design system y los templates, las reglas de negocio, las guías de implementación (catálogo, carro, checkout, Webpay Plus, Flow, transferencia) y el estado del proyecto.

## Cómo usar esta carpeta (instrucciones para el agente)

1. **Lee este README primero.** Las [invariantes](#invariantes-del-proyecto) suelen bastar para tareas chicas.
2. **Enruta según la tarea** con la tabla [¿Qué archivo leo?](#qué-archivo-leo) y abre **solo** lo necesario. Cada archivo es autocontenido.
3. **Frontmatter de cada archivo:**
   - `title`, `description`: de qué trata.
   - `keywords`: términos para buscar con grep.
   - `related`: siguientes lecturas. Las rutas internas son **relativas a esta carpeta** (`documentación/`).
   - `source`: de dónde sale la información (código, SQL, diseño, otra documentación).
   - `estado`: `vigente` (describe lo que existe) · `definido` (está en el diseño o en el SQL, pero no en el código) · `propuesta` (recomendación todavía no implementada).
4. Bajo el título, la línea **"Úsalo cuando:"** dice si el archivo te sirve.
5. **Antes de escribir código**, revisa [07-referencia/trampas-conocidas.md](07-referencia/trampas-conocidas.md) y lee la guía de Next.js en `node_modules/next/dist/docs/` (lo exige `AGENTS.md`).
6. **Al terminar una tarea**, actualiza [08-estado/avance.md](08-estado/avance.md) y [08-estado/registro-de-cambios.md](08-estado/registro-de-cambios.md). Si cerraste una brecha o tomaste una decisión, actualiza también [brechas](07-referencia/brechas-diseno-vs-datos.md) y [decisiones](02-arquitectura/decisiones.md).
7. Búsqueda rápida: `grep -ril "<término>" .` (los nombres de tablas y campos están en inglés; los de la UI, en español).

### Convenciones

| Marca | Significado |
|---|---|
| ✅ | Implementado o decidido |
| 📐 | Definido en el diseño o en el SQL, sin código |
| 💡 | Propuesta recomendada, falta confirmarla |
| ❓ | Decisión pendiente: pregúntale al dueño del proyecto |
| ⏳ | Pendiente |
| ⚠️ | Trampa o problema conocido |
| D-0xx | Decisión de [02-arquitectura/decisiones.md](02-arquitectura/decisiones.md) |
| M0x | Migración pendiente de [03-base-de-datos/migraciones-y-seed.md](03-base-de-datos/migraciones-y-seed.md) |
| B0x | Brecha de [07-referencia/brechas-diseno-vs-datos.md](07-referencia/brechas-diseno-vs-datos.md) |
| `../flow/…`, `../transbank/…` | Rutas a la documentación de las pasarelas, **relativas a la raíz del proyecto** (`shop/`). Desde esta carpeta, agrega un `../` |

---

## Invariantes del proyecto

| Tema | Regla |
|---|---|
| Next.js | **16.4** con `cacheComponents` y `partialPrefetching`. `proxy.ts` (no `middleware.ts`), `'use cache'` + `cacheLife` + `cacheTag`, APIs de request async dentro de `<Suspense>`, `revalidateTag(tag, 'max')`, `updateTag` solo en Server Actions → [stack](01-fundamentos/stack-y-versiones.md) |
| Estilos | CSS Modules + tokens en `globals.css`. **Sin Tailwind**. Solo `var(--token)` → [tokens](04-diseno/tokens.md) |
| Idioma | Código e identificadores en inglés · comentarios, UI y documentación en español de Chile (se trata al cliente de tú, sentence case, sin exclamaciones) |
| Servidor/cliente | `import "server-only"` en todo lo que tenga secretos, la BD o Redis. Las mutaciones van en Server Actions. **Se verifica la sesión en cada acción** |
| Fuente de verdad | **PostgreSQL**: stock, precios, cupones, totales y estados. El carro de Zustand es solo para mostrar |
| Crear un pedido | Solo con `rpc('place_order')` y el cliente **del usuario** (necesita `auth.uid()`). Antes, sincroniza `cart_items` (`syncUserCart`) |
| Dinero | CLP **entero** en la app y en las pasarelas (`numeric(12,2)` en la BD). Se muestra con `formatCLP` → `$12.490` |
| Fechas | `America/Santiago`. Fechas concretas (*Llega el jueves 24 de octubre*) |
| RLS | Todas las tablas. Sin una política = 0 filas, sin error. `service_role` solo en el servidor |
| Webpay | Aprobado = `response_code === 0 && status === "AUTHORIZED"`. Sin webhooks: el retorno llega por GET o POST. Con `TBK_TOKEN` no se hace commit. `buy_order` ≤ 26 |
| Flow | El callback trae solo `token` → `getStatus`. `2` = pagada. `urlConfirmation` debe responder 200 en < 15 s. Envía siempre `timeout` |
| Pedido | `pending` → `paid` (trigger al registrar un pago `paid`) → `processing` → `shipped` → `delivered`. `cancel_order` devuelve el stock pero no reembolsa |
| Carro | Zustand + `localStorage` (`persist` v1), por `variantId`. Con sesión se sincroniza con `cart_items` (`syncUserCart`; fusión al ingresar, D-018). Precios y stock se validan con `refreshCart`; el cupón con `validate_coupon` (solo `service_role`) + rate limiting en Redis |
| Despacho | Lo calcula `place_order` (D-011): gratis desde $39.990 **después del cupón** · RM $3.990 · Regiones $6.990 · Express $4.990 · Retiro gratis |
| Sesión | Invitados con sesión anónima (D-008, activada en Supabase). `createSupabaseServer()` hace `await connection()` (trampa 58) |
| Terminado | `npm run build` + `npm run lint` + `npm run test:run` sin errores, y la documentación actualizada. Tests con Vitest junto al archivo (`*.test.ts`) |

---

## ¿Qué archivo leo?

| Si la tarea es… | Lee |
|---|---|
| Entender qué es el proyecto y qué existe hoy | [01-fundamentos/vision-general.md](01-fundamentos/vision-general.md) → [08-estado/avance.md](08-estado/avance.md) |
| Escribir código de Next.js (qué cambió en la v16) | [01-fundamentos/stack-y-versiones.md](01-fundamentos/stack-y-versiones.md) |
| Levantar el proyecto, scripts, MCP disponibles | [01-fundamentos/entorno-local.md](01-fundamentos/entorno-local.md) |
| Nombres, idioma, estilos, dinero, cuándo está terminado | [01-fundamentos/convenciones-de-codigo.md](01-fundamentos/convenciones-de-codigo.md) |
| Dónde va una pieza de lógica / diagrama general | [02-arquitectura/vision-de-arquitectura.md](02-arquitectura/vision-de-arquitectura.md) |
| Dónde crear un archivo | [02-arquitectura/estructura-de-carpetas.md](02-arquitectura/estructura-de-carpetas.md) |
| URL de una página, su template y su renderizado | [02-arquitectura/rutas-y-paginas.md](02-arquitectura/rutas-y-paginas.md) |
| Cachear o invalidar datos; para qué sirve Redis | [02-arquitectura/renderizado-y-cache.md](02-arquitectura/renderizado-y-cache.md) |
| Carro en Zustand y su sincronización | [02-arquitectura/estado-del-cliente.md](02-arquitectura/estado-del-cliente.md) |
| Login, sesión, roles, invitados, qué cliente de Supabase usar | [02-arquitectura/autenticacion-y-autorizacion.md](02-arquitectura/autenticacion-y-autorizacion.md) |
| Decisiones tomadas y pendientes | [02-arquitectura/decisiones.md](02-arquitectura/decisiones.md) |
| Visión general del esquema y sus relaciones | [03-base-de-datos/modelo-de-datos.md](03-base-de-datos/modelo-de-datos.md) |
| Columnas de productos, variantes, stock, imágenes o reseñas | [03-base-de-datos/tablas-catalogo.md](03-base-de-datos/tablas-catalogo.md) |
| Columnas de perfiles, direcciones, carro o favoritos | [03-base-de-datos/tablas-usuarios-y-carrito.md](03-base-de-datos/tablas-usuarios-y-carrito.md) |
| Columnas de pedidos, pagos o cupones | [03-base-de-datos/tablas-pedidos-y-pagos.md](03-base-de-datos/tablas-pedidos-y-pagos.md) |
| `place_order`, `cancel_order` o un trigger | [03-base-de-datos/funciones-y-triggers.md](03-base-de-datos/funciones-y-triggers.md) |
| Una consulta que devuelve vacío / permisos / Storage | [03-base-de-datos/seguridad-rls.md](03-base-de-datos/seguridad-rls.md) |
| Aplicar el esquema, crear una migración, generar tipos, seed | [03-base-de-datos/migraciones-y-seed.md](03-base-de-datos/migraciones-y-seed.md) |
| Escribir un texto de la interfaz / accesibilidad | [04-diseno/principios-voz-y-accesibilidad.md](04-diseno/principios-voz-y-accesibilidad.md) |
| Colores, tipografía, espaciado, breakpoints | [04-diseno/tokens.md](04-diseno/tokens.md) |
| Props y reglas de un componente | [04-diseno/componentes.md](04-diseno/componentes.md) |
| Qué bloques lleva una pantalla | [04-diseno/templates.md](04-diseno/templates.md) |
| Navegación entre pantallas y pasos del checkout | [04-diseno/flujo-de-compra.md](04-diseno/flujo-de-compra.md) |
| Estados de espera, error y resultado del pago (textos exactos) | [04-diseno/estados-y-mensajes.md](04-diseno/estados-y-mensajes.md) |
| Precio, despacho, stock, cupones, plazos | [05-dominio/reglas-de-negocio.md](05-dominio/reglas-de-negocio.md) |
| Estados del pedido y del pago, vencimientos, carreras | [05-dominio/ciclo-de-vida-del-pedido.md](05-dominio/ciclo-de-vida-del-pedido.md) |
| Formatear CLP o fechas; validar RUT, teléfono o dirección | [05-dominio/formatos-chile.md](05-dominio/formatos-chile.md) |
| **"Sigue con el proyecto"** / qué va primero | [06-implementacion/hoja-de-ruta.md](06-implementacion/hoja-de-ruta.md) |
| Conectar Supabase | [06-implementacion/integrar-supabase.md](06-implementacion/integrar-supabase.md) |
| Crear los componentes de UI y aplicar el diseño | [06-implementacion/portar-design-system.md](06-implementacion/portar-design-system.md) |
| Inicio, Listado, Ficha, Búsqueda | [06-implementacion/catalogo-y-busqueda.md](06-implementacion/catalogo-y-busqueda.md) |
| Drawer, página del carro, cupón | [06-implementacion/carro.md](06-implementacion/carro.md) |
| Checkout y creación del pedido | [06-implementacion/checkout-y-pedidos.md](06-implementacion/checkout-y-pedidos.md) |
| **Pago con tarjeta (Webpay Plus)** | [06-implementacion/pagos-webpay-plus.md](06-implementacion/pagos-webpay-plus.md) |
| **Pago con Flow** | [06-implementacion/pagos-flow.md](06-implementacion/pagos-flow.md) |
| Transferencia, reserva de 48 h, cron de vencimiento | [06-implementacion/pago-transferencia.md](06-implementacion/pago-transferencia.md) |
| Agregar o buscar una variable de entorno | [07-referencia/variables-de-entorno.md](07-referencia/variables-de-entorno.md) |
| Algo no funciona como se espera | [07-referencia/trampas-conocidas.md](07-referencia/trampas-conocidas.md) |
| ¿El diseño lo muestra pero los datos no lo soportan? | [07-referencia/brechas-diseno-vs-datos.md](07-referencia/brechas-diseno-vs-datos.md) |
| Publicar en producción | [07-referencia/checklist-produccion.md](07-referencia/checklist-produccion.md) |
| Qué significa un término (carro, comuna, `token_ws`…) | [07-referencia/glosario.md](07-referencia/glosario.md) |
| Artifacts de diseño, documentación de Flow y Transbank, MCP, documentación de Next | [07-referencia/recursos-externos.md](07-referencia/recursos-externos.md) |
| Estado actual / qué falta | [08-estado/avance.md](08-estado/avance.md) |
| Cuándo cambió algo | [08-estado/registro-de-cambios.md](08-estado/registro-de-cambios.md) |

### Tabla de la BD → archivo

| Tablas | Archivo |
|---|---|
| `categories`, `brands`, `products`, `product_variants`, `product_images`, `inventory_movements`, `reviews`, vista `product_catalog` | [03-base-de-datos/tablas-catalogo.md](03-base-de-datos/tablas-catalogo.md) (+ la vista en [modelo-de-datos.md](03-base-de-datos/modelo-de-datos.md#vista-product_catalog)) |
| `profiles`, `addresses`, `carts`, `cart_items`, `wishlist_items` | [03-base-de-datos/tablas-usuarios-y-carrito.md](03-base-de-datos/tablas-usuarios-y-carrito.md) |
| `orders`, `order_items`, `payments`, `coupons`, `coupon_redemptions` | [03-base-de-datos/tablas-pedidos-y-pagos.md](03-base-de-datos/tablas-pedidos-y-pagos.md) |

### Pantalla → archivos

| Pantalla | Diseño | Implementación |
|---|---|---|
| Inicio, Listado, Ficha, Sin resultados, 404 | [templates](04-diseno/templates.md#flujo-de-compra) | [catalogo-y-busqueda](06-implementacion/catalogo-y-busqueda.md) |
| Drawer, Carro, Carro vacío | [templates](04-diseno/templates.md#flujo-de-compra) | [carro](06-implementacion/carro.md) |
| Checkout (+ errores, procesando) | [flujo-de-compra](04-diseno/flujo-de-compra.md#checkout-en-detalle) | [checkout-y-pedidos](06-implementacion/checkout-y-pedidos.md) |
| Confirmación, Pago rechazado, Flow no completado | [estados-y-mensajes](04-diseno/estados-y-mensajes.md) | [pagos-webpay-plus](06-implementacion/pagos-webpay-plus.md), [pagos-flow](06-implementacion/pagos-flow.md) |
| Transferencia pendiente | [estados-y-mensajes](04-diseno/estados-y-mensajes.md#transferencia-pendiente) | [pago-transferencia](06-implementacion/pago-transferencia.md) |
| Ingresar, Mis pedidos, Detalle de pedido | [templates](04-diseno/templates.md#cuenta) | [autenticacion](02-arquitectura/autenticacion-y-autorizacion.md), [ciclo de vida](05-dominio/ciclo-de-vida-del-pedido.md#cómo-se-muestra-ui) |
| Direcciones, Favoritos, Datos personales | [templates](04-diseno/templates.md#cuenta) | [D-030](02-arquitectura/decisiones.md), [rutas](02-arquitectura/rutas-y-paginas.md#cuenta), [tablas](03-base-de-datos/tablas-usuarios-y-carrito.md) (M10) |
| Reseñas (Ficha, Escribe tu opinión) | [templates](04-diseno/templates.md#flujo-de-compra) | [D-031](02-arquitectura/decisiones.md), [tablas](03-base-de-datos/tablas-catalogo.md) (M11), [RLS](03-base-de-datos/seguridad-rls.md) |
| Administración (pedidos, anular, alertas) | [templates](04-diseno/templates.md#administración) | [D-029](02-arquitectura/decisiones.md), [rutas](02-arquitectura/rutas-y-paginas.md#administración-74-d-029), [funciones M9](03-base-de-datos/funciones-y-triggers.md) |

---

## Estructura

```
documentación/
├── README.md                          ← este índice
├── 01-fundamentos/                    ← qué es, con qué se construye y cómo se trabaja
│   ├── vision-general.md              alcance, módulos, estado por capa, servicios externos
│   ├── stack-y-versiones.md           versiones y diferencias de Next.js 16
│   ├── entorno-local.md               ejecutar, scripts, MCP, datos de prueba de pagos
│   └── convenciones-de-codigo.md      idioma, nombres, server/client, dinero, fechas, terminado
├── 02-arquitectura/                   ← cómo encajan las piezas
│   ├── vision-de-arquitectura.md      diagrama, responsabilidades, dónde vive cada regla
│   ├── estructura-de-carpetas.md      árbol actual y objetivo; dónde va cada archivo
│   ├── rutas-y-paginas.md             URL → template → datos → renderizado
│   ├── renderizado-y-cache.md         use cache, tags, invalidación, rol de Redis
│   ├── estado-del-cliente.md          carro en Zustand y sincronización con la BD
│   ├── autenticacion-y-autorizacion.md  clientes de Supabase, proxy, roles, invitados
│   └── decisiones.md                  registro D-001…D-031
├── 03-base-de-datos/                  ← Supabase / PostgreSQL
│   ├── modelo-de-datos.md             tablas por dominio, relaciones, enums, vista
│   ├── tablas-catalogo.md
│   ├── tablas-usuarios-y-carrito.md
│   ├── tablas-pedidos-y-pagos.md
│   ├── funciones-y-triggers.md        place_order, cancel_order, is_admin, triggers
│   ├── seguridad-rls.md               matriz de permisos y Storage
│   ├── migraciones-y-seed.md          aplicar, convenciones, M1–M6, tipos
│   └── sql/
│       ├── ecommerce_schema.sql       ← fuente de verdad del esquema
│       └── ecommerce_seed.sql
├── 04-diseno/                         ← design system Almacén
│   ├── principios-voz-y-accesibilidad.md
│   ├── tokens.md                      color, tipografía, espaciado, CSS listo para pegar
│   ├── componentes.md                 15 componentes + formatCLP
│   ├── templates.md                   57 pantallas, piezas globales y correos
│   ├── flujo-de-compra.md             recorrido y checkout en detalle
│   └── estados-y-mensajes.md          espera, errores, resultado del pago (textos exactos)
├── 05-dominio/                        ← reglas del negocio
│   ├── reglas-de-negocio.md           precios, despacho, stock, cupones, pagos
│   ├── ciclo-de-vida-del-pedido.md    estados, transiciones, vencimientos, carreras
│   └── formatos-chile.md              CLP, RUT, teléfono, dirección, fechas
├── 06-implementacion/                 ← guías paso a paso (el "cómo")
│   ├── hoja-de-ruta.md                fases 0–7 y dependencias
│   ├── integrar-supabase.md
│   ├── portar-design-system.md
│   ├── catalogo-y-busqueda.md
│   ├── carro.md
│   ├── checkout-y-pedidos.md
│   ├── pagos-webpay-plus.md
│   ├── pagos-flow.md
│   └── pago-transferencia.md
├── 07-referencia/                     ← consulta rápida
│   ├── variables-de-entorno.md
│   ├── trampas-conocidas.md
│   ├── brechas-diseno-vs-datos.md     B1–B36
│   ├── checklist-produccion.md
│   ├── glosario.md
│   └── recursos-externos.md           artifacts, Flow, Transbank, MCP, Next docs
├── 08-estado/                         ← dónde está el proyecto
│   ├── avance.md
│   └── registro-de-cambios.md
└── _archivo/                          ← documentos originales (solo referencia histórica)
    ├── avance-del-proyecto.md
    ├── diseno-almacen.md
    ├── pendientes-antes-de-produccion.md   ← lista única para publicar
    ├── pendientes-del-dueno-fase-5.md
    ├── pendientes-del-dueno-fase-6.md      ← tareas del dueño tras los pagos
    └── pendientes-del-despliegue.md        ← lo que quedó del primer despliegue (audazia.dev)
```
