---
title: "Hoja de ruta de implementación"
description: "Orden recomendado para construir la tienda (fases 0 a 7), con las dependencias entre tareas, la guía de cada una y su criterio de terminado."
keywords: ["hoja de ruta", "roadmap", "plan", "fases", "orden", "tareas", "dependencias", "próximos pasos", "backlog"]
related: ["08-estado/avance.md", "02-arquitectura/decisiones.md", "07-referencia/brechas-diseno-vs-datos.md"]
source: ["_archivo/avance-del-proyecto.md §6", "_archivo/diseno-almacen.md §6", "análisis de la documentación (2026-10-23)"]
estado: "propuesta"
---

# Hoja de ruta

> **Úsalo cuando:** te piden "seguir con el proyecto" o "implementar X" y necesitas saber qué va antes. Marca el avance en [08-estado/avance.md](../08-estado/avance.md).

Cada fase depende de las anteriores, salvo cuando se indica otra cosa.

## Fase 0 · Base del proyecto
| Tarea | Guía | Terminado cuando |
|---|---|---|
| `layout.tsx`: `lang="es-CL"`, metadata de Almacén, fuentes Bricolage Grotesque + Instrument Sans con `next/font/google` | [portar-design-system.md](portar-design-system.md) | `npm run build` pasa y la página muestra las fuentes nuevas |
| Tokens en `globals.css` (claro y oscuro) | [04-diseno/tokens.md](../04-diseno/tokens.md) | No quedan `--background`/`--foreground` de la plantilla |
| Quitar la plantilla (`page.tsx`, `page.module.css`, SVG de `public/`) | — | |
| Corregir `.gitignore` para versionar `.env.example` (`!.env.example`) | [07-referencia/variables-de-entorno.md](../07-referencia/variables-de-entorno.md) | |
| `src/lib/format/` (CLP, RUT, teléfono, fechas) | [05-dominio/formatos-chile.md](../05-dominio/formatos-chile.md) | Casos de prueba del documento OK |

## Fase 1 · Base de datos y Supabase
| Tarea | Guía | Terminado cuando |
|---|---|---|
| Verificar o aplicar el esquema en el proyecto `nswchmyzgcutyehhuche` | [03-base-de-datos/migraciones-y-seed.md](../03-base-de-datos/migraciones-y-seed.md) | `list_tables` muestra las 17 tablas y los advisors no tienen errores |
| Seed de Almacén (categorías del diseño) | ídem (M6) | Inicio y Listado con datos coherentes |
| Instalar `@supabase/supabase-js` + `@supabase/ssr` y crear los 3 clientes | [integrar-supabase.md](integrar-supabase.md) | `/` lee categorías desde Supabase |
| Tipos generados en `src/types/database.ts` | ídem | |
| `src/proxy.ts` (refresco de la sesión) | ídem | |

## Fase 2 · Design system
| Tarea | Guía |
|---|---|
| Portar los 15 componentes + `Select` a `src/components/ui/` | [portar-design-system.md](portar-design-system.md) |
| Header, Footer, layouts `(tienda)` y `(checkout)` | [04-diseno/templates.md](../04-diseno/templates.md#piezas-globales) |

Se puede hacer **en paralelo** con la fase 1.

## Fase 3 · Catálogo
| Tarea | Guía |
|---|---|
| Inicio, Listado (filtros, orden, paginación), Ficha, Búsqueda, Sin resultados, 404 | [catalogo-y-busqueda.md](catalogo-y-busqueda.md) |
| Caché con tags | [02-arquitectura/renderizado-y-cache.md](../02-arquitectura/renderizado-y-cache.md) |

### Pendientes del catálogo sin fase fija
Se hacen cuando se cumple su condición. Ninguno bloquea la compra.

| Tarea | Se hace cuando… | Referencia |
|---|---|---|
| Filtros **Tipo** y **Color** del Listado: migración M5 (colores y tipo en `product_catalog`) + chips | El dueño define la lista de tipos por categoría (por ejemplo, Cerámica: Tazas, Platos, Fuentes, Floreros) | B17 · [migraciones](../03-base-de-datos/migraciones-y-seed.md) |
| `next/image` en `ProductCard`, galería de la Ficha y categorías del Inicio + `images.remotePatterns` hacia Storage | El dueño sube las fotos reales al bucket `product-images`. **Obligatorio antes de producción** | D-015 · [checklist](../07-referencia/checklist-produccion.md) |

## Fase 4 · Carro
| Tarea | Guía |
|---|---|
| Nueva forma de `CartItem` + `setQuantity` + `version` | [carro.md](carro.md) |
| Drawer, página Carro y Carro vacío | ídem |
| Cupón: migración M3 (`validate_coupon`) + *Aplicar cupón* | ídem |

✅ Terminada el 2026-10-24. Queda para la fase 5: `syncCart` antes de `place_order` y la fusión al iniciar sesión (D-018).

## Fase 5 · Cuenta y checkout ✅ (2026-10-24; fecha en la Ficha 2026-10-25)
| Tarea | Guía |
|---|---|
| `syncCart` (obligatorio antes de `place_order`) + fusión del carro al iniciar sesión (D-018) | [02-arquitectura/estado-del-cliente.md](../02-arquitectura/estado-del-cliente.md#sincronización-con-la-base-de-datos-fase-5) |
| Ingresar / Crear cuenta / sesión anónima (D-008) | [02-arquitectura/autenticacion-y-autorizacion.md](../02-arquitectura/autenticacion-y-autorizacion.md) |
| Migraciones M1 + M2 (campos del pedido, despacho, redondeo, `expires_at`) | [03-base-de-datos/migraciones-y-seed.md](../03-base-de-datos/migraciones-y-seed.md) |
| Checkout en 3 pasos + validaciones + `place_order` | [checkout-y-pedidos.md](checkout-y-pedidos.md) |
| ✅ Fecha de entrega concreta en la Ficha (*Llega el martes 27 de octubre a Providencia*) con la comuna guardada en una cookie (checkout o selector de la Ficha), 25-10-2026 | B35 · [reglas de negocio](../05-dominio/reglas-de-negocio.md#despacho) |

## Fase 6 · Pagos ✅ (2026-10-25)
| Tarea | Guía |
|---|---|
| ✅ Webpay Plus: create → retorno → commit → resultado | [pagos-webpay-plus.md](pagos-webpay-plus.md) |
| ✅ Flow: create → confirmación → retorno → resultado (sin túnel en local, D-024) | [pagos-flow.md](pagos-flow.md) |
| ✅ Transferencia + cron de vencimiento (M4, Vercel Cron, D-021) | [pago-transferencia.md](pago-transferencia.md) |
| ✅ Confirmación, Pago rechazado, Flow no completado, Transferencia pendiente (+ confirmando, vencido, reembolsado) | [04-diseno/estados-y-mensajes.md](../04-diseno/estados-y-mensajes.md) |
| ✅ Locks en Redis para el commit (D-005), fail-open con respaldo en la BD | [02-arquitectura/renderizado-y-cache.md](../02-arquitectura/renderizado-y-cache.md#rol-de-redis) |
| ✅ Reintentar / cambiar de medio sobre el mismo pedido; B13 con reembolso + alerta (D-020) | [checkout-y-pedidos.md](checkout-y-pedidos.md) |
| ⏳ Fuera de la fase: ~~túnel o despliegue para `urlConfirmation`~~ (✅ probada en `audazia.dev`, 25-10-2026), confirmación manual de transferencias (administración, fase 7) | — |

## Fase 7 · Postcompra y operación
| Tarea | Notas |
|---|---|
| ✅ Mis pedidos, Detalle de pedido | 7.1 (D-026) |
| ✅ Direcciones, Favoritos, Datos personales | 7.5 (D-030, M10): artboards de Cuenta; `profiles.rut` y `newsletter_opt_in_at`. Falta: textos propuestos (T12) y el código HTTP de `/cuenta/*` (7.8) |
| ✅ Reseñas | 7.6 (D-031, M11, B36): *Escribe tu opinión* con pedido entregado y sin invitados, firma *Nombre · Comuna* puesta por la BD, la propia se edita. Falta: textos propuestos (T14) |
| *Los más vendidos* en el Inicio (hoy *Destacados*) | Función con el ranking de pedidos pagados + respaldo a *Destacados* si hay menos de 4. Detalle en B34 ([brechas](../07-referencia/brechas-diseno-vs-datos.md)) |
| ✅ Correos transaccionales: despacho y anulación (7.3, D-028) | Resend (D-022). Los de confirmación, transferencia y pago devuelto ya existen (fase 6) y se envían desde `mail.audazia.dev` |
| Boleta/factura electrónica | **Sin proveedor definido** (D-012) |
| Administración: ✅ pedidos, confirmar transferencias y alertas de pago (7.4, D-029); catálogo pendiente | El catálogo no tiene diseño. Confirmar una transferencia = `settle_payment(…, 'paid', …)`; las alertas están en `payment_alerts` |
| ✅ Convertir al invitado en cuenta desde la Confirmación; *Ver estado del pedido* | 7.2 (D-027, B38) |
| Pasar a producción | [07-referencia/checklist-produccion.md](../07-referencia/checklist-produccion.md) |
