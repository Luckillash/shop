---
title: "Pendientes al cierre de la fase 7"
description: "Todo lo que queda abierto el 28-10-2026, al terminar la fase 7: tareas y decisiones del dueño (T8 a T19, 7c), lo que falta para publicar por bloque (desarrollo, datos, proveedores, Supabase, infraestructura y verificación) y las mejoras anotadas para más adelante. Junta en un solo lugar los pendientes de la fase 7, de producción y del despliegue."
generated: "2026-10-28"
estado: "vigente"
related: ["_archivo/pendientes-del-dueno-fase-7.md", "_archivo/pendientes-antes-de-produccion.md", "_archivo/pendientes-del-despliegue.md", "_archivo/plan-fase-7.md", "07-referencia/checklist-produccion.md", "08-estado/avance.md", "02-arquitectura/decisiones.md"]
---

# Pendientes al cierre de la fase 7

Foto del **28-10-2026**, con la fase 7 terminada (7.0 a 7.8). Junta lo que sigue abierto en [pendientes del dueño de la fase 7](pendientes-del-dueno-fase-7.md), [pendientes antes de producción](pendientes-antes-de-produccion.md), [pendientes del despliegue](pendientes-del-despliegue.md) y las secciones *Lo que deja la 7.x…* del [plan](plan-fase-7.md). El detalle y los pasos siguen en esos archivos; cuando cierres algo, márcalo allí y aquí.

**Quién:** 👤 tú · 🤖 el agente · 👥 los dos.
**Prioridad:** 🔴 sin esto no se puede publicar · 🟠 importante · 🟢 mejora, puede ir después.

**Estado del sitio:** `audazia.dev` responde 200 con la 7.7 desplegada (commit `1a10a61`). La 7.8 también está desplegada (commit `b24396d`, verificada el 28-10-2026 a las 05:17 UTC). Pagos en integración/sandbox, base de Supabase compartida entre desarrollo y producción, sin Redis, cron diario (Hobby).

**Datos de prueba hoy:** 51 usuarios (8 con correo y 43 anónimos) y los pedidos 1001–1048 (no hay 1037; el próximo es el 1049).

---

## 1. Lo inmediato (fase 7)

| # | Qué | Quién | Prioridad | Estado |
|---|---|---|---|---|
| T18 | **Activar la limpieza de invitados.** La 7.8 ya está desplegada (`b24396d`) y la limpieza **no borra nada** (sin `ANON_CLEANUP_ENABLED` solo cuenta). Después de ver un par de logs `[cron] limpiar-anonimos` con `dryRun: true`, define `ANON_CLEANUP_ENABLED=true` en Vercel → Production y redespliega | 👤 | 🟢 | ⏳ |
| T11 | **Confirmar que el cron diario corre con 200.** El del 27-10 nunca apareció en los logs (el sitio estuvo deshabilitado hasta el 28-10, T15); el del 28-10 y el del 29-10 están por revisar (Hobby: entre las 09:00 y las 09:59 UTC). El agente lo revisa con el MCP de Vercel; tú puedes mirarlo en *Cron Jobs* | 👥 | 🔴 | ⏳ |
| T9 | Quitarle el rol `admin` a `prueba.fase5@almacen.cl` (dijiste *todavía no*). Se va igual al borrar los usuarios de prueba | 🤖 con tu aviso | 🔴 antes de producción | ⏳ |
| T10 | Revisar los textos propuestos de la 7.4 (administración, motivos de anulación, correo de transferencia anulada) | 👤 | — (quedan así si no dices nada) | ⏳ |
| T12 | Revisar los textos y las propuestas de la 7.5 (Direcciones, Favoritos, Datos personales, precarga del checkout) | 👤 | — | ⏳ |
| T14 | Revisar los textos y las propuestas de la 7.6 (reseñas) | 👤 | — | ⏳ |
| T17 | Al lanzar: `BEST_SELLERS_SINCE` con la fecha de lanzamiento en Vercel → Production y redesplegar (sin ella, *Destacados*). Revisar las propuestas de la 7.7 | 👤 | 🟢 | ⏳ |
| — | Revisar las propuestas de la 7.8: `volver` con la query, el invitado va a Ingresar sin aviso especial, 30 días desde la última actividad, qué nunca se borra, un solo cron | 👤 | — | ⏳ |
| T8 | **Buzón real** para las respuestas de los correos: el cliente con una transferencia anulada manda ahí sus datos bancarios. Hoy `hola@almacen.cl` es de ejemplo | 👤 | 🔴 (con el contacto real del bloque 3) | ⏳ |
| 7c | Suscripción del footer: dejarla deshabilitada hasta tener un proveedor de newsletter | 👤 | 🟢 | ⏳ |

T13, T16 y T19 son informativas (contraseñas de las cuentas de prueba cambiadas con la API; te las di en el chat, no se anotan). T15 ✅.

## 2. Desarrollo que falta (🤖)

| Qué | Prioridad | De dónde |
|---|---|---|
| **Páginas de ayuda y legales** (`/ayuda/terminos`, `/ayuda/privacidad`, `/ayuda/despacho`, `/ayuda/contacto`): el header, el footer y el checkout ya enlazan a ellas y dan 404. El texto lo pones tú (bloque 3). Con `/ayuda/contacto`, *Necesito ayuda con este pedido* puede enlazar ahí | 🔴 | Producción, bloque 3 |
| Comprobar que la plataforma **sobrescribe `x-forwarded-for`** (el rate limiting usa esa IP): enviar uno inventado a `audazia.dev` cuando haya Redis | 🔴 | Producción, bloque 7 |
| `error.tsx` por grupo de rutas, con un `Notice` útil | 🟠 | Producción, bloque 3 |
| **Tests E2E** (Playwright) del flujo de compra y de los pagos (hoy 318 tests unitarios y pruebas con scripts de CDP) | 🟠 | Producción, bloque 3 |
| `next/image` con las fotos reales (`remotePatterns` hacia Storage, D-015) | 🟠 | Producción, bloque 3 |
| `npm audit`: 5 vulnerabilidades *high* heredadas de la plantilla | 🟠 | Producción, bloque 3 |
| Región de las funciones (`iad1`) frente a la de Supabase | 🟠 | Despliegue, tarea 9 |
| `get_advisors` (seguridad y rendimiento) justo antes de publicar | 🟠 | Producción, bloque 6 |
| `NEXT_PUBLIC_SITE_URL` de Preview apunta a producción | 🟢 | Despliegue, tarea 10 |
| Filtros **Tipo** y **Color** del Listado (M5, B17, B20, B33): esperan que definas los tipos de producto | 🟢 | Producción, bloque 3 |
| Feriados de **2028** en `src/lib/chile/business-days.ts` (antes de diciembre de 2027) y, si se quieren, los regionales (Arica 7 de junio, Chillán 20 de agosto) | 🟢 | Producción, bloque 3 |
| Revisión de accesibilidad (teclado, foco, contraste en claro y oscuro, lectores de pantalla) y metadata/Open Graph por página | 🟢 | Producción, bloque 3 |
| Cerrar las otras sesiones al instante al cambiar la contraseña (hoy caen al renovar el token, ≤ 1 h, trampa 86) | 🟢 | 7.5 |
| Favorito pendiente al crear una cuenta nueva (con la confirmación de correo se pierde; se podría llevar en el enlace) | 🟢 | 7.5, D-030 |
| Moderar opiniones sin entrar a Supabase (hoy `is_published = false` a mano e invalidar `reviews:<productId>` y `products`) | 🟢 | 7.6, D-031 |
| Newsletter: cuando haya proveedor (7c), leer `profiles.newsletter_opt_in_at` y poner el enlace para darse de baja en cada envío | 🟢 | 7.5, B21 |

## 3. Datos y decisiones del negocio (👤)

| Qué | Prioridad |
|---|---|
| **Razón social, RUT y correo de contacto reales** (hoy *Almacén SpA · 76.543.210-3 · hola@almacen.cl*, de ejemplo, en `src/lib/store.ts`) | 🔴 |
| **Términos y condiciones** y **política de privacidad** (idealmente revisados por un abogado) | 🔴 |
| **Catálogo real:** productos, precios, stock y fotos 4:5 | 🔴 |
| **Cupones reales** (desactivar o borrar BIENVENIDA10 y DESCUENTO5000) | 🔴 |
| Textos de *Despacho y plazos* y del contacto | 🟠 |
| Tipos de producto para los filtros del Listado | 🟠 |
| Confirmar las reglas propuestas: express en todas las comunas de la RM (también las rurales), retiro desde el día hábil siguiente | 🟢 |

## 4. Proveedores y cuentas (👤)

| Qué | Prioridad |
|---|---|
| **Transbank:** contrato, código de comercio de producción, validación aprobada, llave secreta y una compra real de prueba | 🔴 |
| **Flow:** cuenta de producción, medios de pago, `apiKey` y `secretKey` | 🔴 |
| **Boleta y factura electrónica:** proveedor autorizado por el SII (D-012). *Descargar boleta* sigue oculto | 🔴 |
| Llave `almacen-produccion` de **Resend** en Vercel (hoy la local) y revisar si los correos caen en spam (despliegue, tarea 4) | 🔴 |
| Integración con Starken para el seguimiento (hoy el código se escribe a mano) | 🟢 |

## 5. Supabase

| Qué | Quién | Prioridad |
|---|---|---|
| **Borrar los usuarios de prueba**: todos salvo `lucassalazarc@outlook.com` (hoy 51: 8 con correo, entre ellos `prueba.fase5@almacen.cl` y las de mailinator, y 43 anónimos). La limpieza de la 7.8 no los toca: solo borra invitados sin pedidos con 30 días sin actividad | 👤 | 🔴 |
| **Base de datos compartida:** decidir si producción tiene un proyecto propio (despliegue, tarea 5) | 👥 | 🔴 |
| Activar **Leaked password protection** (aviso de los advisors) | 👤 | 🔴 |
| **Respaldos** y revisar el plan de Supabase (límites de Auth, base y almacenamiento) | 👤 | 🔴 |
| Activar **Secure password change** (hoy Datos personales cambia la contraseña sin pedir la actual; la app ya tiene el aviso) | 👤 | 🟠 |
| **Captcha** (Turnstile o hCaptcha) para crear cuentas y sesiones anónimas | 👤 | 🟠 |

## 6. Infraestructura y despliegue (👥)

| Qué | Prioridad |
|---|---|
| **Variables de producción que faltan:** `REDIS_URL`, credenciales de producción de Webpay y Flow, llave de Resend de producción. Cuando las apruebes: `BEST_SELLERS_SINCE` (T17) y `ANON_CLEANUP_ENABLED` (T18) | 🔴 |
| **Redis en producción** (Upstash o Redis Cloud): sin él, el rate limiting del login, el cupón, los invitados, los pedidos, los reintentos y las opiniones deja pasar todo (fail-open, D-005) | 🔴 |
| **Cron:** confirmar que corre a diario (T11). Para volver a cada 10 min hay que pasar a Pro (`*/10 * * * *`; despliegue, tarea 6). Mientras siga en Hobby, un pedido abandonado retiene stock hasta ~24 h | 🔴 / 🟠 |
| **Pagos en sandbox sobre un sitio público** (despliegue, tarea 1): cualquiera puede "comprar" con la tarjeta de prueba | 🔴 |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fija si hay más de una instancia | 🟠 |
| **Monitoreo:** `/api/health` en un servicio de uptime y alertas de errores (hoy responde 503 sin Redis) | 🟠 |

## 7. Verificación final (antes de abrir)

| Qué | Quién | Prioridad |
|---|---|---|
| `npm run build` (borrando `.next`), `npm run lint` y `npm run test:run` sin errores | 🤖 | 🔴 |
| **Compra real con Webpay** (Transbank pide una de $50) y anularla o reembolsarla | 👥 | 🔴 |
| **Compra real con Flow** y una **transferencia** confirmada a mano | 👥 | 🔴 |
| Casos de pago en producción: aprobado, rechazado, abortado, timeout, recarga del retorno y pago tardío (✅ en integración/sandbox) | 🤖 | 🔴 |
| Compra como invitado y con cuenta, en escritorio y en un celular real | 👥 | 🔴 |
| **Borrar los pedidos de prueba 1001–1048** (no hay 1037): primero `cancel_order` a los pagados (1020–1022, 1027, 1028, 1036, 1038) para devolver el stock; el enviado 1040 y los entregados 1043, 1044 y 1047 se corrigen a mano o al cargar el catálogo real. El 1042 sigue anulado con el pago de Flow sandbox sin reembolsar y su alerta `refund_failed` abierta. Después, borrar de `orders` (cascada a `payments` y `payment_alerts`). Pasos en la tarea 6 de la [fase 6](pendientes-del-dueno-fase-6.md) | 🤖 | 🔴 |
| Seed de prueba fuera de la base de producción y caché de Next invalidada después de cargar el catálogo real (trampa 47) | 🤖 | 🔴 |
| Revisión visual de todas las pantallas en claro y oscuro, a 1280 y 390 px | 👥 | 🟠 |
| Revisar los correos que recibe el cliente (para verlos sin buzón propio, maildrop.cc; trampa 80) | 👤 | 🟠 |

## 8. Más adelante (sin diseño o no urgente)

| Qué | De dónde |
|---|---|
| Administración del catálogo (productos, stock, cupones) y lista de pedidos en móvil: sin diseño | 7.4, D-029 |
| Una alerta `refund_failed` no se cierra sola cuando el reintento sale bien (la cierra el admin) | 7.4, D-029 |
| La lista de pedidos de la administración trae todos y cuenta en la app: con miles de pedidos, contar en la BD | 7.4, D-029 |
| Reintentar el reembolso del 1042 si Flow sandbox repone fondos (trampa 84) | 7.4 |
| Fecha en el paso *Preparado* del seguimiento (habría que exponer al cliente la fecha del evento `processing`) | 7.1 |
| El checkout precarga una sola dirección; elegir entre varias no tiene diseño | 7.5, D-030 |
| *Ver todas las opiniones* (paginación) con más de 10 por producto; responder una opinión no está en el diseño | 7.6, D-031 |
| Orden *Más vendidos* en el Listado (necesita una vista o función con las unidades por producto) | 7.7, D-032 |
| Ranking al instante después de un pago: invalidar un tag propio (`best-sellers`), no `products` | 7.7, D-032 |
| El Detalle de pedido y `/admin/*` consultan la BD también en cada prefetch y navegación (el proxy no ve la cabecera `rsc`, trampa 95). Con mucho tráfico, bajar el `prefetch` de las tarjetas de Mis pedidos | 7.8, D-033 |
| Si algún día hay más de 500 invitados por día para borrar, subir el tope (la función acepta hasta 1000) o pasar a Pro | 7.8, D-033 |
