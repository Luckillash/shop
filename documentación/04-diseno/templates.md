---
title: "Templates: las 40 pantallas y las piezas globales"
description: "Estructura de cada template del canvas Almacén · Templates (compra, cuenta, contenido y estados del pago), en escritorio y móvil, más el header, el footer y el layout reducido del checkout."
keywords: ["templates", "pantallas", "inicio", "listado", "ficha", "carro", "drawer", "checkout", "confirmación", "ingresar", "mis pedidos", "detalle de pedido", "404", "sin resultados", "carro vacío", "header", "footer", "pago rechazado", "transferencia pendiente"]
related: ["04-diseno/flujo-de-compra.md", "04-diseno/estados-y-mensajes.md", "02-arquitectura/rutas-y-paginas.md"]
source: ["_archivo/diseno-almacen.md §3, §4"]
estado: "definido"
---

# Templates

> **Úsalo cuando:** implementas una página y necesitas saber qué bloques lleva y en qué orden. La ruta de cada template está en [02-arquitectura/rutas-y-paginas.md](../02-arquitectura/rutas-y-paginas.md).

Son 40 artboards en https://claude.ai/artifact/E7sfHjPteptX18QCaikCri. Escritorio fluido (referencia 1280px); móvil de 390px. La columna "Archivos" son los nombres de los artboards.

## Piezas globales

| Pieza | Contenido |
|---|---|
| **Header (escritorio)** | Franja `promo` (*Despacho gratis sobre $39.990 · Revisa los plazos para tu comuna*) · logotipo "Almacén" · navegación (Cerámica, Textiles, Velas, Cocina, Ofertas) · buscador redondeado (*Busca tazas, mantas, velas…*) · `IconButton` ghost de cuenta y favoritos · carro con contador en `brand` |
| **Header (móvil)** | Franja promo corta (*Despacho gratis sobre $39.990*) · menú hamburguesa · logotipo · cuenta · carro con contador · buscador en una fila aparte |
| **Footer** | Fondo `surface-sunken` · descripción de la marca · suscripción por correo · columnas *Tienda*, *Ayuda* y *Almacén* · `© 2026 Almacén · Almacén SpA · RUT 76.543.210-3` + *Pago seguro con tarjeta de crédito, débito o transferencia*. La razón social y el RUT son ajustables. Tiene una variante móvil |
| **Header y footer del checkout** | Logotipo, *Pago seguro* con candado, *Volver al carro* (sin enlace mientras se procesa el pago). El footer solo lleva enlaces legales y de ayuda. **Sin navegación** |

**Implementación (fase 2):** `src/components/layout/`

| Pieza | Archivo | Notas |
|---|---|---|
| Header | `header.tsx` (Server, `async`) + `cart-link.tsx` (Client) | Un solo header responsivo (cambia a escritorio desde 768px). La navegación sale de `getCategories()` + *Ofertas*, así que dice "Velas y aromas" (nombre en la base) y no "Velas". El menú móvil es un `<details>`, sin JavaScript. El buscador usa `next/form` hacia `/buscar?q=`. El contador del carro lee Zustand con `useSyncExternalStore` (0 en el servidor, sin errores de hidratación) |
| Footer | `footer.tsx` (Server, `async`) | Columna *Tienda* desde `getCategories()`. Razón social y RUT desde `src/lib/store.ts`. **La suscripción está deshabilitada** hasta que exista dónde guardarla (B21) |
| Header y footer del checkout | `checkout-header.tsx` (`backToCart={false}` mientras se procesa el pago) + `checkout-footer.tsx` | Estilos en `checkout-chrome.module.css` |
| Layouts | `src/app/(tienda)/layout.tsx` · `src/app/(checkout)/layout.tsx` | Los grupos no cambian la URL |

Los enlaces apuntan a las rutas de [02-arquitectura/rutas-y-paginas.md](../02-arquitectura/rutas-y-paginas.md) (`/categorias/[slug]`, `/ofertas`, `/buscar`, `/carro`, `/cuenta`, `/ayuda/...`), que responden 404 hasta las fases siguientes.

## Flujo de compra

| Template | Archivos | Estructura |
|---|---|---|
| **Inicio** | `Main` / `InicioMovil` | Hero en `promo` (`display-xl`, *Ver novedades* primary + *Ver ofertas* secondary) · 3 beneficios (despacho gratis, 30 días para cambios, pago seguro) · *Explora por categoría* (4 tarjetas 4:5) · *Lo nuevo* (4 `ProductCard`) · banner de oferta en `sale-soft` (*Hasta −30% en textiles*) · *Los más vendidos* |
| **Listado** | `Listado` / `ListadoMovil` | Migas de pan · título (`display`) con conteo · filtros con `FilterChip` (Tipo, Color, Precio, Disponibilidad) · ordenar por (Destacados, Menor precio, Mayor precio, Novedades, Mejor evaluados) · filtros activos + *Limpiar filtros* · grilla de `ProductCard` · *Mostrando 8 de 12* + barra + *Cargar más productos* |
| **Ficha** | `Ficha` / `FichaMovil` | Migas · galería (miniaturas verticales + imagen 4:5 con `Badge`) · columna fija: marca (`overline`), nombre (`heading-lg`), `Rating`, `Price lg`, `VariantPicker` color, `Badge warning` de stock bajo, `QuantityStepper` + *Agregar al carro* (primary lg) + favorito · bloque de entrega (fecha, comuna, despacho gratis, cambios en 30 días) · Descripción (con el origen de la pieza) y Detalles (material, capacidad, medidas, cuidado, SKU en mono) · Opiniones · *Te podría gustar* |
| **Carro · drawer** | `CarroDrawer` | Drawer derecho de 440px sobre `scrim`: `Notice success` (*Agregaste … al carro*), `FreeShippingBar`, `CartItem`s, subtotal, nota (*El despacho y los cupones se calculan en el siguiente paso*), *Ir a pagar* (primary) y *Ver carro* (secondary) |
| **Carro** | `Carro` / `CarroMovil` | *Tu carro · N productos* + *Seguir comprando* · `FreeShippingBar` · `CartItem`s · cupón (`TextField` + *Aplicar cupón*) · resumen fijo (subtotal, despacho, total, *Ir a pagar*, nota de pago seguro) · fecha de llegada y cambios en 30 días · *Te podría gustar* |
| **Checkout** | `Checkout` / `CheckoutMovil` | Ver [flujo-de-compra.md](flujo-de-compra.md#checkout-en-detalle) |
| **Confirmación** | `Confirmacion` / `ConfirmacionMovil` | Check en `success-soft` · *Pedido N.º 10482* (mono) · *Gracias, tu pedido está confirmado* · correo de la boleta · tarjeta de entrega (fecha y dirección) · *Qué viene ahora* (3 pasos; entrega entre 9:00 y 20:00) · `Notice` para crear una cuenta · *Seguir comprando* (primary) + *Ver estado del pedido* · detalle a la derecha (*Total pagado*, *Pagado con tarjeta de débito vía Webpay Plus · Boleta electrónica*) |

## Cuenta

| Template | Archivos | Estructura |
|---|---|---|
| **Ingresar o crear cuenta** | `Ingresar` / `IngresarMovil` | Dos columnas. **Ingresar:** correo, contraseña, *¿Olvidaste tu contraseña?*, *Ingresar* (primary), enlace *comprar como invitado*. **Crear cuenta** (fondo `promo`): beneficios, nombre, correo, contraseña (mínimo 8 caracteres), opción de recibir novedades, *Crear cuenta* (secondary), aviso legal |
| **Mis pedidos** | `MisPedidos` / `MisPedidosMovil` | Menú de cuenta (Mis pedidos, Direcciones, Favoritos, Datos personales, Cerrar sesión) · lista con número, `Badge` de estado, fecha de compra, miniaturas, fecha de entrega, resumen, total y *Ver detalle* |
| **Detalle de pedido** | `DetallePedido` / `DetallePedidoMovil` | Migas · número + `Badge` · seguimiento (*Despacha Starken*, código, *Seguir el envío*) con una línea de tiempo de 4 pasos · productos con *Volver a comprar* · dirección, pago y totales · *Descargar boleta* y *Necesito ayuda con este pedido* |

Las páginas de Direcciones, Favoritos y Datos personales **no tienen template**.

## Contenido y estados vacíos

| Template | Archivos | Estructura |
|---|---|---|
| **Página de contenido** (*Despacho y plazos*) | `Contenido` / `ContenidoMovil` | Migas · menú de Ayuda · artículo de hasta 760px: título, fecha de actualización, secciones, tabla de plazos y costos por zona, preguntas frecuentes en `<details>`, `Notice` de contacto (*hola@almacen.cl*, respuesta en menos de un día hábil) |
| **Búsqueda sin resultados** | `SinResultados` / `SinResultadosMovil` | Ícono · *No encontramos resultados para "…"* · consejo · buscador con la consulta · *Búsquedas populares* (chips) · *Te podría interesar* |
| **Carro vacío** | `CarroVacio` / `CarroVacioMovil` | Ícono de carro · *Tu carro está vacío* · recordatorio del despacho gratis · *Explorar la tienda* (primary) + *Ver mis favoritos* · *Novedades* |
| **404** | `NoEncontrada` / `NoEncontradaMovil` | *Error 404* (mono) · *No encontramos esta página* · buscador · *Volver al inicio* (primary) · chips de categorías |

## Estados del pago

| Template | Archivos | Resumen |
|---|---|---|
| Checkout · errores en el formulario | `CheckoutErrores` / `CheckoutErroresMovil` | `Notice danger` *Revisa N datos…* con enlaces a cada campo |
| Checkout · procesando el pago | `CheckoutProcesando` / `CheckoutProcesandoMovil` | `aria-busy`, fieldsets deshabilitados, *Pagando*, línea `role="status"` |
| Pago rechazado · Webpay Plus | `PagoRechazado` / `PagoRechazadoMovil` | `role="alert"`, causa, *Tu pedido sigue guardado*, 3 caminos, *Reintentar pago* |
| Pago no completado · Flow | `PagoRechazadoFlow` (`caso="flow"`) | Variante del anterior con textos de Flow |
| Transferencia pendiente | `TransferenciaPendiente` / `TransferenciaPendienteMovil` | `Badge warning`, monto, fecha límite, datos con *Copiar* |
| Botones · reposo y espera | `EstadosBotones` | Tabla de pares verbo → gerundio |

Textos exactos en [estados-y-mensajes.md](estados-y-mensajes.md).

## Sin diseño

- **Toast de producto agregado:** el token `z-toast` existe, pero ninguna pantalla lo usa (el drawer cumple ese rol).
- **Pago no completado en Flow, móvil:** `PagoRechazadoMovil` admite ambos casos, pero solo el escritorio tiene un artboard de Flow.
- **Opiniones:** siguen con placeholders.
- **Pago abortado en Webpay** (`TBK_TOKEN`): no tiene un texto propio. Usa *Pago rechazado* o adapta el texto de Flow.
- **Administración** (catálogo, pedidos, confirmar transferencias): no hay diseño.
- Direcciones, Favoritos y Datos personales.
