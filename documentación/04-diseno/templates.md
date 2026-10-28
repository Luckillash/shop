---
title: "Templates: las 57 pantallas y las piezas globales"
description: "Estructura de cada template del canvas Almacén · Templates (compra, cuenta, contenido, estados del pago, administración y correos), en escritorio y móvil, más el header, el footer, el layout reducido del checkout y el mapa de estados después de pagar."
keywords: ["templates", "pantallas", "inicio", "listado", "ficha", "carro", "drawer", "checkout", "confirmación", "ingresar", "mis pedidos", "detalle de pedido", "direcciones", "favoritos", "datos personales", "opinión", "reseña", "invitado", "administración", "admin", "alertas de pago", "anular", "correos", "404", "sin resultados", "carro vacío", "header", "footer", "pago rechazado", "transferencia pendiente"]
related: ["04-diseno/flujo-de-compra.md", "04-diseno/estados-y-mensajes.md", "02-arquitectura/rutas-y-paginas.md"]
source: ["_archivo/diseno-almacen.md §3, §4"]
estado: "definido"
---

# Templates

> **Úsalo cuando:** implementas una página y necesitas saber qué bloques lleva y en qué orden. La ruta de cada template está en [02-arquitectura/rutas-y-paginas.md](../02-arquitectura/rutas-y-paginas.md).

Son 57 pantallas y un mapa de estados en https://claude.ai/artifact/E7sfHjPteptX18QCaikCri, el **único canvas de referencia**. Escritorio fluido (referencia 1280px); móvil de 390px. La columna "Archivos" son los nombres de los artboards. El canvas *Almacén — Flujo de compra* es una versión anterior guardada como archivo: no lo uses para implementar.

Las pantallas de administración, de Direcciones, Favoritos y Datos personales, la opinión, la creación de cuenta del invitado y los correos se agregaron el 25-10-2026 para la fase 7. Sus patrones están en el manual del design system (secciones *Pedidos: estados*, *Cuenta*, *Administración* y *Correos*).

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
| **Mis pedidos** | `MisPedidos` / `MisPedidosMovil` | Menú de cuenta (Mis pedidos, Direcciones, Favoritos, Datos personales, Cerrar sesión) · lista con número, `Badge` de estado, fecha de compra, miniaturas, fecha de entrega, resumen, total y *Ver detalle*. Muestra los 6 estados: *Pago pendiente* (`warning`), *En preparación*, *En camino*, *Entregado*, *Reembolsado* (`neutral` + `returns`) y *Anulado* (`danger` + `close`), cada uno con una línea de qué pasó (B24) |
| **Detalle de pedido** | `DetallePedido` / `DetallePedidoMovil` | Migas · número + `Badge` · seguimiento (*Despacha Starken*, código, *Seguir el envío*) con una línea de tiempo de 4 pasos · productos con *Volver a comprar* · dirección, pago y totales · *Descargar boleta* y *Necesito ayuda con este pedido* |
| **Direcciones** | `Direcciones` / `DireccionesMovil` | Menú de cuenta · *Agregar dirección* · tarjetas en 2 columnas (nombre *Casa*/*Oficina*, `Badge new` *Principal*, destinatario, dirección, comuna, teléfono; *Editar*, *Usar como principal*, *Eliminar*) · formulario con los campos del checkout (nombre de la dirección, teléfono, nombre, apellido, región, comuna, calle y número, depto.) y *Usar como dirección principal* · *Guardar dirección* (primary) |
| **Favoritos** | `Favoritos` / `FavoritosMovil` | Menú de cuenta · *N productos guardados* · grilla de `ProductCard` con `wishlisted` (3 columnas; 2 en móvil), agotados con *Sin stock* · vacío (tweak `vacio`): ícono, *Todavía no guardas favoritos*, *Explorar la tienda* |
| **Datos personales** | `DatosPersonales` / `DatosPersonalesMovil` | Menú de cuenta · *Tus datos* (nombre, apellido, teléfono, RUT opcional; correo fijo en `surface-sunken`), *Guardar cambios* (primary) y `Notice success` *Guardamos tus cambios* · *Contraseña* (nueva, mínimo 8) · *Correos de la tienda* (novedades) · nota para eliminar la cuenta |
| **Escribe tu opinión** | `EscribirResena` | Modal sobre la Ficha: producto comprado y fecha · 5 estrellas de 44px con la calificación en palabras (*4 de 5 · Muy buena*) · título opcional · texto (mínimo 20 caracteres) · *Se publica con tu nombre y comuna* · *Publicar opinión* → `Notice success` *Gracias, publicamos tu opinión* (B36). ✅ Implementado en la 7.6 (D-031): `src/components/catalog/review-dialog.tsx`. Diferencias: la elegibilidad se pregunta al abrirlo (sin sesión → Ingresar; invitado → *Para opinar, crea tu cuenta*; sin pedido entregado → *Puedes opinar cuando recibas este producto*); si ya opinó, el mismo modal es *Edita tu opinión* con *Guardar cambios*; si la cuenta no tiene nombre, pide *Tu nombre*; la pista dice la firma real (*Se publica con tu nombre: María.* en el retiro). Ninguna estrella viene marcada (el artboard muestra 4 como ejemplo) |
| **Confirmación · invitado crea su cuenta** | `ConfirmacionCrearCuenta` | La Confirmación con el aviso en fondo `promo`: correo fijo, contraseña, novedades, *Crear cuenta* (secondary) → `Notice success` *Listo, creamos tu cuenta* (D-008, D-024, B38) |

✅ Direcciones, Favoritos y Datos personales implementados en la 7.5 (`src/app/(tienda)/cuenta/`, `src/components/account/`, D-030). Diferencias con los artboards (las de texto son propuestas, T12 de los pendientes del dueño):

- **Menú:** las cuatro secciones; en móvil el chip de la sección actual se desplaza a la vista.
- **Direcciones:** *Usar como principal* (el artboard; la documentación decía *predeterminada*). *Agregar dirección* no se muestra sin direcciones ni con 10 guardadas (tope propuesto); el formulario siempre está debajo. *Editar* llena el formulario y cambia el título a *Editar <nombre>*. *Eliminar* pide confirmar en la tarjeta. Sin nombre de la dirección (las del checkout), la tarjeta se titula con la comuna. La casilla *Usar como dirección principal* queda marcada y fija en la primera dirección y en la principal, con una nota. Estado vacío sin diseño: una línea de texto y el formulario.
- **Favoritos:** el subtítulo es solo *N productos guardados* (sin *Te avisamos por aquí si alguno baja de precio o se agota*: ese aviso no existe). Quitar un favorito lo saca de la grilla con un aviso y *Deshacer*. La tarjeta es la del catálogo (`CatalogProductCard`), con *Agregar al carro* o *Ver opciones*.
- **Datos personales:** la nota del correo usa `STORE.contactEmail`. *Correos de la tienda* tiene título también en móvil y se guarda al marcar o desmarcar, con un aviso *Listo: …*. Después de cambiar la contraseña: *Cambiamos tu contraseña. Cerramos tu sesión en los demás dispositivos.* El móvil también muestra la nota para eliminar la cuenta.
- **Ingresar** con `?favorito=`: aviso *Ingresa o crea tu cuenta para guardar tus favoritos. Lo que elegiste se guarda al ingresar.*

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

## Administración

Sin el header ni el footer de la tienda: usa `AdminHeader` (*Almacén* + `Badge` *Administración*, *Pedidos*, *Alertas de pago* con el número sin resolver, *Ver la tienda*, *Cerrar sesión*).

| Template | Archivos | Estructura |
|---|---|---|
| **Pedidos** | `AdminPedidos` | *Pedidos* + fecha y cuántos necesitan una acción · buscador por N.º o correo · `Notice warning` de alertas abiertas · chips de estado con conteo (*Necesitan una acción*, *Transferencia por confirmar*, *Por preparar*, *En preparación*, *En camino*, *Entregados*, *Anulados*, *Todos*) · tabla (pedido y fecha, cliente y correo, pago y despacho, total, `Badge` + nota, botón con el siguiente paso) · *Mostrando 8 de N* + *Ver más pedidos* |
| **Pedido** | `AdminPedido` (tweak `estado`) | Migas · N.º + `Badge` · tarjeta *Siguiente paso* con una sola acción primary según el estado: *Confirmar pago recibido* (N.º de operación opcional), *Empezar a preparar*, *Marcar como enviado* (transportista + código de seguimiento), *Marcar como entregado*, o el `Notice danger` del anulado · productos con SKU · historial (cuándo, qué, quién) · *Anular el pedido* · al lado: cliente, despacho, intentos de pago con `Badge`, totales con IVA |
| **Anular pedido** | `AdminAnularPedido` | Modal: motivo (lo ve el cliente), *Avisar al cliente por correo*, `Notice warning` *Esto no se puede deshacer* con el monto del reembolso · *Volver al pedido* + *Anular y reembolsar* |
| **Alertas de pago** | `AdminAlertas` | Chips *Sin resolver* / *Resueltas* · tarjetas por alerta (`payment_alerts.kind`: *Reembolso fallido* `danger`, *Pago después de anular* y *Pago doble* `warning`) con qué pasó, *Qué hacer*, pedido, pasarela, monto y referencia · *Marcar como resuelta* · *Resueltas hace poco* |
| **Confirmar transferencia · móvil** | `AdminPedidoMovil` | El pedido con la transferencia por confirmar en una columna: monto exacto, mensaje, vencimiento, N.º de operación y *Confirmar pago recibido* |

Etiquetas de estado para la administración: `pending` *Transferencia por confirmar* (o *Pago pendiente*), `paid` *Por preparar*, `processing` *En preparación*; el resto igual que en Mis pedidos.

✅ Implementados en la 7.4 (`src/app/admin/`, `src/components/admin/`, D-029). Diferencias con los artboards (las de texto son propuestas, T10 de los pendientes del dueño):

- **AdminPedidos:** *Necesitan una acción* incluye los pedidos anulados con un pago sin devolver (botón *Devolver el pago*). La lista va del más antiguo al más nuevo en ese filtro y del más nuevo al más antiguo en los demás; 20 por página. La fecha de cada fila es concreta (*Dom 25 oct · 10:12*), sin *Hoy* ni *Ayer*. Con una búsqueda se buscan todos los estados. El `Notice` de alertas resume por tipo (*1 reembolso fallido y 2 pagos después de anular.*). Estado vacío: *No hay pedidos en este filtro.*
- **AdminPedido:** además de los 5 estados del tweak: *Esperando el pago* (tarjeta o Flow pendientes, sin acción), *Devuelve el pago* (anulado con el pago sin devolver: *Reembolsar $X en Flow*), *Devuélvele $X por transferencia* con *Ya devolví el dinero* (decisión 5), *Nada pendiente* con el `Notice success` del entregado, y el retiro en tienda (*Avisa que está listo para retirar*, *Confirma el retiro*). El cliente dice *Con cuenta* / *Compró como invitado* y *Primer pedido* / *N pedidos anteriores*. Los intentos llevan su referencia; un pago por devolver dice *Por devolver*. *Siguiente paso* muestra el resultado de la acción (*Listo: …*) arriba de la tarjeta.
- **AdminAnularPedido:** las opciones del motivo son frases para el cliente (*Nos quedamos sin stock de un producto del pedido.*), más *Otro motivo* (texto) y *Sin motivo*; la ayuda dice qué leerá el cliente. El aviso y el botón cambian con el dinero: *Anular y reembolsar* (pasarela), *Devuélvele $X por transferencia* o *No hay nada que devolver*.
- **AdminAlertas:** la tarjeta agrega la respuesta de la pasarela cuando la hay (*Respuesta de Flow: …*); *Resueltas* muestra las tarjetas sin *Qué hacer*. Tipo sin artboard: *Monto distinto* (`amount_mismatch`).
- **AdminPedidoMovil** es AdminPedido en una columna: el monto, el mensaje y el vencimiento de la transferencia pasan a una lista; las migas cambian por *‹ Pedidos*.

## Correos

640px de artboard, tarjeta de 560px, fuentes del sistema y colores en hex (los clientes de correo no cargan variables ni Google Fonts).

| Correo | Archivo | Contenido |
|---|---|---|
| Pedido confirmado | `CorreoConfirmacion` | N.º, *Gracias, tu pedido está confirmado*, monto y medio · fecha de entrega en `promo` · productos, despacho y total · *Ver el pedido* |
| Pedido en camino | `CorreoDespacho` | *Tu pedido va en camino*, transportista y fecha · código de seguimiento + *Seguir el envío* · dirección · productos y total |
| Pedido anulado | `CorreoAnulacion` (tweak `motivo`: `vencio`, `tienda`, `cliente`) | *Anulamos tu pedido N.º …*, el motivo · bloque de dinero (*No hicimos ningún cargo* o *Te devolvimos $…*) · productos · *Volver a la tienda* |

✅ Implementados en la 7.3 (`src/lib/email/templates.ts`, D-028), también para los correos sin artboard (datos para transferir, pago devuelto) y las plantillas de Supabase Auth. Diferencias con el artboard:

- Los bloques se separan con margen (no flex) y en pantallas angostas los márgenes bajan a 12 px (página) y 20 px (tarjeta). Los títulos no cortan *N.º 1041*.
- *Ver el pedido* va a Mis pedidos con cuenta y a la Confirmación como invitado; en el despacho, el invitado lee *Puedes ver el detalle en la página del pedido* en vez de *Mis pedidos* (propuesta).
- Confirmación: *con tarjeta de débito vía Webpay Plus* (el mismo texto del medio de pago de la app; el artboard dice *en Webpay Plus*); fila *Descuento* si hubo cupón; con retiro en tienda, el bloque `promo` lleva el horario y la dirección del local y la fila dice *Retiro* (propuestas).
- Despacho: sin *Si no vas a estar, Starken deja un aviso…* (depende de cada transportista); despacho propio y retiro en tienda con su propio texto (propuestas, en pendientes del dueño).
- Anulación: *escríbenos a hola@almacen.cl* en lugar de *respóndenos* / *responde este correo* (el remitente no recibe respuestas). Textos para tienda sin nota, reembolso pendiente y sin cobro sin transferencia. Todas las propuestas de esta lista fueron aprobados sin cambios por el dueño el 26-10-2026 (T6).

## Mapa de estados

`FlujoPostcompra`: una columna por `orders.status` (de `pending` a `cancelled · refunded`) y tres filas: la pantalla que ve el cliente, el correo que recibe y el botón de la administración. Marca lo que es nuevo de la fase 7.

## Sin diseño

- **Toast de producto agregado:** el token `z-toast` existe, pero ninguna pantalla lo usa (el drawer cumple ese rol).
- **Pago no completado en Flow, móvil:** `PagoRechazadoMovil` admite ambos casos, pero solo el escritorio tiene un artboard de Flow.
- ~~**Opiniones publicadas en la Ficha:** siguen con placeholders~~ ✅ 7.6 (D-031): resumen (promedio grande, estrellas, *Basado en N opiniones*, *Escribir una opinión*) y tarjetas con *Compra verificada* y la firma *Nombre · Comuna · fecha* (sin comuna en el retiro). Sin opiniones: *Todavía no hay opiniones de este producto. Las publican quienes ya lo recibieron.* (propuesta). En móvil no hay *Ver las N opiniones*: se muestran las 10 más recientes (propuesta).
- **Pago abortado en Webpay** (`TBK_TOKEN`): no tiene un artboard propio; sus textos están en [estados-y-mensajes.md](estados-y-mensajes.md) (B14).
- **Administración del catálogo** (productos, stock, cupones) y la versión móvil de la lista de pedidos.
- **Escribe tu opinión** y **Crear cuenta del invitado** en móvil. La 7.6 usa el mismo modal a todo el ancho con 16 px de margen y desplazamiento interno (propuesta).
