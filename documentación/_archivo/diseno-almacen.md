# Shop · Diseño: sistema, templates y flujo de compra

_Última actualización: 23 de octubre de 2026 (incluye los estados de pago y formularios)_

## 1. Resumen

El diseño de la tienda se llama **Almacén**: una tienda en línea de objetos para la casa (cerámica, textiles, velas y cocina). Se siente como un almacén de barrio bien ordenado: cálido, claro y rápido de recorrer. Todo apunta a tres momentos: encontrar el producto, entender cuánto cuesta y cuándo llega, y pagar sin dudas.

El diseño está en tres artifacts de claude.ai:

| Artifact | Contenido | Enlace |
|---|---|---|
| Design system **Almacén** | Tokens (claro/oscuro), manual de marca, patrones de pago y 15 componentes React | https://claude.ai/artifact/8ueRvwVuopKWk3enu498tj |
| **Almacén · Templates de la tienda** | 40 pantallas (escritorio y móvil): compra, cuenta, contenido, estados vacíos/error y estados del pago | https://claude.ai/artifact/E7sfHjPteptX18QCaikCri |
| **Almacén — Flujo de compra** | Canvas del flujo en 6 pasos (inicio → confirmación) | https://claude.ai/artifact/9otwRsPJLSkA4HHCvjDKCV |

> **Ojo con el canvas "Flujo de compra":** su índice define 15 pantallas, pero solo tiene los archivos de 4: Inicio (escritorio y móvil), Header y Footer. En esta revisión solo cambió su Footer (se agregaron los datos legales). Las pantallas de Listado, Ficha, Carro, Checkout y Confirmación siguen sin existir ahí. El flujo completo está en el canvas de **Templates**, y este documento se basa en él (sección 5).

---

## 2. Design system

### 2.1 Principios

1. **El precio nunca se esconde.** Precio, descuento y costo de despacho se ven antes de agregar al carro. Nada de "Consultar precio" ni costos que aparecen en el último paso.
2. **Una acción principal por vista.** Un solo botón `primary` (verde `brand`); todo lo demás es `secondary` o `ghost`.
3. **El producto es el color.** La interfaz es papel (`surface`) y tinta (`ink`); las fotos ponen el color. El verde y el tomate se usan con intención, no para decorar.
4. **Confianza en cada paso.** Fechas de entrega concretas, errores que dicen cómo resolverse, y estados que se leen con palabra e ícono además del color.

### 2.2 Voz y contenido

- Se habla de **tú**, en español de Chile claro: *carro*, *despacho*, *boleta*, *comuna*, *RUT*.
- **Sentence case** en todo (*Agregar al carro*, no *Agregar Al Carro*). Las mayúsculas se usan solo en el estilo `overline` (marca del producto) y en los códigos de cupón.
- **Sin signos de exclamación ni emoji.**
- Botones con **verbo + objeto**: *Agregar al carro*, *Ir a pagar*, *Aplicar cupón*, *Ver carro*.
- **Fechas, no plazos vagos:** *Llega el jueves 24 de octubre*. Si no hay fecha exacta: *Despacho a regiones en 3 a 5 días hábiles*.
- **Errores que ayudan:** qué pasó y qué hacer. *El banco no autorizó la compra. Prueba con otra tarjeta o paga por transferencia.*
- **Cifras:** `$12.490` (punto de miles, sin decimales, sin espacio tras el signo). Los decimales llevan coma: *4,6 estrellas*. Se formatean con `formatCLP`.

| En vez de | Escribe |
|---|---|
| ¡Cómpralo ya! | Agregar al carro |
| Error 402 | Tu pago fue rechazado |
| Envío gratis (aplican condiciones) | Despacho gratis sobre $39.990 |
| Stock limitado | Quedan 2 unidades de este color |
| RUT inválido | Revisa el dígito verificador |

### 2.3 Pago y formularios: estados

Cada paso del pago tiene un estado de espera, uno de error y uno de salida, y los templates muestran cada uno en escritorio y móvil (sección 4.4).

- **Medios de pago:**
  - Tarjeta de crédito o débito en **Webpay Plus**.
  - Otros medios en **Flow**.
  - **Transferencia bancaria**, con el pedido reservado por **48 horas**.

  El texto siempre dice dónde terminará de pagar la persona (*Pagarás en Webpay Plus*).
- **Espera:**
  - El `Button` primario pasa a `loading` con el verbo en gerundio (*Pagando*, *Guardando*, *Agregando*, *Aplicando*). Conserva su tamaño y no acepta otro clic.
  - Los campos del paso quedan deshabilitados.
  - Una línea con `role="status"` dice qué pasa y qué no hacer: *Te estamos llevando a Webpay Plus. No cierres ni actualices esta página.*
- **Errores de formulario:**
  - Al presionar la acción con datos incompletos, aparece un `Notice` `danger` arriba del paso. Cuenta los errores (*Revisa 5 datos para continuar*) y enlaza a cada campo.
  - Cada `TextField` muestra su `error` con la solución, no el diagnóstico (*Agrega el número de la calle, por ejemplo Av. Providencia 1234.*).
  - El botón sigue activo.
- **Pago rechazado:**
  - Título directo: *Tu pago fue rechazado*, o *Tu pago en Flow no se completó* si fue en Flow.
  - La causa en una frase, más *No hicimos ningún cargo*.
  - Un `Notice` `info` confirma que el pedido sigue guardado.
  - Tres caminos numerados y el selector de medios, con *Reintentar pago* como acción principal.
- **Transferencia pendiente:**
  - `Badge` `warning` *Pago pendiente* y el monto en el título.
  - Fecha y hora límite exactas (*hasta el sábado 24 de octubre a las 22:00*).
  - Cada dato bancario con su botón *Copiar*.
  - Un `Notice` `warning` que explica qué pasa si la transferencia no llega a tiempo.

### 2.4 Color

Dos temas: **Claro** (`light`) y **Oscuro** (`dark`). Todos los pares texto/fondo que se nombran cumplen WCAG AA (4.5:1) en ambos temas.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `surface` | `#f7f5f0` | `#151513` | Fondo de página (papel cálido): listados, carro y checkout. |
| `surface-raised` | `#ffffff` | `#1f1e1b` | Tarjetas, resumen del pedido, campos, menús y drawers. |
| `surface-sunken` | `#ece8df` | `#0e0e0c` | Fondo de imágenes mientras cargan, barras de filtros. |
| `line` | `#dcd5c9` | `#34322d` | Bordes de tarjetas, divisores, pistas de progreso. Decorativo: nunca es el único límite de un control. |
| `line-strong` | `#857b6d` | `#7d766b` | Bordes de controles (campos, chips, cantidad) y estrellas vacías (≥3:1). |
| `ink` | `#1b1a17` | `#f2efe8` | Texto principal y títulos. |
| `ink-muted` | `#5c564d` | `#ada699` | Texto secundario: marca, variantes, ayudas, precio anterior. |
| `brand` | `#1f5a44` | `#7cc8a6` | Verde pino. Acción principal, enlaces, progreso, anillo de foco. |
| `brand-hover` | `#174735` | `#9ad6bb` | Hover y pressed de los rellenos `brand`. |
| `brand-soft` | `#e0ede6` | `#1b3a2f` | Insignia *Nuevo*, hover de botones ghost, ítem activo de menús. |
| `on-brand` | `#ffffff` | `#0f1f18` | Texto sobre relleno `brand`. Nunca blanco literal. |
| `sale` | `#b9351b` | `#ff8a66` | Tomate. **Solo** precios rebajados y % de descuento. Nunca para errores. |
| `sale-soft` | `#fbe5dd` | `#4a1d12` | Fondo de banners de oferta. |
| `on-sale` | `#ffffff` | `#1c0a05` | Texto sobre relleno `sale`. |
| `accent` | `#a66c00` | `#f0b53d` | Mostaza. Estrellas de `Rating` y bloques de campaña; no lleva texto de cuerpo. |
| `promo` | `#efe4cf` | `#2e2a21` | Arena. Banners de campaña y `FreeShippingBar`. |
| `success` | `#0b6b55` | `#5fcdb0` | Verde azulado (distinto de `brand`): en stock, despacho gratis, ahorro. |
| `success-soft` | `#dcefe9` | `#123a31` | Fondo de avisos de éxito. |
| `warning` | `#8a5a00` | `#f2c063` | Últimas unidades, retrasos de despacho, pago pendiente. |
| `warning-soft` | `#fbefd3` | `#3d2c0b` | Fondo de avisos de advertencia. |
| `danger` | `#b3261e` | `#ff8b82` | Errores de formulario y pagos rechazados. |
| `danger-soft` | `#fbe3e1` | `#4a1714` | Fondo de avisos de error. |
| `scrim` | `#1b1a1799` | `#000000b3` | Velo detrás del drawer del carro y modales. |
| `link` | `{brand}` | `{brand}` | Enlaces en texto corrido (alias de `brand`). |

Reglas:

- Los estados (`success`, `warning`, `danger`) **siempre van con ícono o palabra**; nunca se comunican solo con color.
- `success` tira hacia el azul para que, con daltonismo, se distinga de `danger`.

### 2.5 Tipografía

Familias (Google Fonts, importadas por `bundle.css`; si fallan, se usa la sans del sistema):

| Familia | Token | Stack |
|---|---|---|
| Titulares | `display` / `--font-display` | `"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif` |
| Interfaz | `sans` / `--font-sans` | `"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| Código | `mono` / `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

| Estilo | Familia | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `display-xl` | display | 56 / 58 px | 700 | −0.02em | Hero de campaña (uno por página). |
| `display` | display | 40 / 44 px | 700 | −0.015em | Título de categoría y de páginas principales. |
| `heading-lg` | display | 28 / 34 px | 600 | −0.01em | Nombre del producto en la ficha. |
| `heading` | display | 22 / 28 px | 600 | — | Títulos de sección y carruseles. |
| `heading-sm` | display | 18 / 24 px | 600 | — | Tarjetas, drawers y pasos del checkout. |
| `body-lg` | sans | 17 / 26 px | 400 | — | Descripción en la ficha. |
| `body` | sans | 15 / 22 px | 400 | — | Texto por defecto. |
| `body-sm` | sans | 13 / 18 px | 400 | — | Variantes, ayudas, metadatos. |
| `label` | sans | 14 / 20 px | 600 | — | Botones, etiquetas, chips. |
| `caption` | sans | 12 / 16 px | 500 | 0.01em | Notas legales, insignias. |
| `overline` | sans | 11 / 16 px | 600 | 0.08em | Marca del producto, siempre en mayúsculas. |
| `price-lg` | sans | 28 / 32 px | 700 | −0.01em | Precio en la ficha y total del pedido. |
| `price` | sans | 18 / 24 px | 700 | — | Precio en tarjetas. |
| `price-sm` | sans | 14 / 20 px | 600 | — | Carro, mini carro, filas del resumen. |
| `sku` | mono | 12 / 16 px | 400 | — | SKU y números de pedido. |

- Bricolage Grotesque **nunca** se usa en botones, precios ni formularios.
- Los precios siempre llevan `font-variant-numeric: tabular-nums`.
- Las descripciones tienen un largo de línea máximo de 70 caracteres.

### 2.6 Espaciado, tamaños y layout

**Espaciado (base de 4px)**

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4px | Ícono a etiqueta en insignias; entre estrellas y conteo. |
| `space-2` | 8px | Ícono a etiqueta en botones; entre chips y variantes. |
| `space-3` | 12px | Filas relacionadas; padding de avisos. |
| `space-4` | 16px | Padding de tarjetas; gap de grilla en móvil. |
| `space-5` | 20px | Padding horizontal de botones md. |
| `space-6` | 24px | Padding del resumen del pedido; gap de grilla en escritorio. |
| `space-8` | 32px | Entre bloques de una sección. |
| `space-12` | 48px | Entre secciones de una página. |
| `space-16` | 64px | Antes y después del hero y del footer. |

**Tamaños**

| Token | Valor | Uso |
|---|---|---|
| `control-sm` | 32px | Chips, botones pequeños, cantidad en el carro. |
| `control-md` | 40px | Botones, campos y cantidad por defecto. |
| `control-lg` | 48px | *Agregar al carro* en la ficha e *Ir a pagar*. |
| `touch-target` | 44px | Área táctil mínima en móvil. |
| `thumb` | 72px | Miniatura en el carro (4:5). |
| `container` | 1280px | Ancho máximo del contenido. |

**Breakpoints (mobile first)**

| Token | Valor | Qué cambia |
|---|---|---|
| `bp-sm` | 480px | Teléfonos grandes. |
| `bp-md` | 768px | 3 columnas; filtros en un panel lateral plegable. |
| `bp-lg` | 1024px | 4 columnas; filtros fijos a la izquierda. |
| `bp-xl` | 1280px | Se alcanza `container`. |

**Layout**

- Contenido centrado hasta `container`, con márgenes de `space-4` en móvil y `space-6` desde `bp-md`.
- Grilla de productos: 2 columnas en móvil, 3 desde `bp-md` y 4 desde `bp-lg`.
- Ficha: galería a la izquierda (≈ 7/12) e información de compra a la derecha (≈ 5/12), fija al hacer scroll. En móvil, la compra pasa a una barra fija inferior (`shadow-sm`, `z-sticky`).
- Carro: lista a la izquierda y `OrderSummary` fijo a la derecha. En móvil, el resumen va debajo.

### 2.7 Forma, elevación y capas

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 4px | Insignias. |
| `radius-md` | 8px | Botones, campos, tallas, avisos, miniaturas del carro. |
| `radius-lg` | 12px | Tarjetas, resumen del pedido, imágenes de la ficha. |
| `radius-xl` | 20px | Banners de campaña y drawers. |
| `radius-full` | 9999px | Chips, selector de cantidad, botones de ícono, muestras de color. |

| Sombra | Uso |
|---|---|
| `shadow-sm` | Barra fija de *Agregar al carro* en móvil; header al hacer scroll. |
| `shadow-md` | Tarjeta de producto en hover; menús y sugerencias del buscador. |
| `shadow-lg` | Drawer del carro y modales. |
| `focus-ring` | Foco de teclado: 2px del color de página + 2px de `brand`. |

Primero bordes, después sombras: en reposo, las tarjetas solo tienen borde `line`.

| z-index | Valor | Uso |
|---|---|---|
| `z-sticky` | 100 | Barra fija de compra, filtros fijos. |
| `z-header` | 200 | Header del sitio. |
| `z-drawer` | 400 | Drawer del carro y su scrim. |
| `z-modal` | 500 | Modales. |
| `z-toast` | 600 | Confirmación de producto agregado. |

### 2.8 Imágenes, movimiento e iconografía

- **Imágenes de producto:** proporción 4:5 y mínimo 1200 × 1500 px. Fondo liso y cálido, con el producto ocupando ≈ 70% del cuadro. Sin texto ni precios sobre la foto. Mientras carga, el espacio se reserva en `surface-sunken`. El `alt` describe el producto (color, material), no "foto de producto".
- **Movimiento:** transiciones de 150–200 ms `ease-out`, solo en color, borde, sombra y avance de barras. El drawer del carro entra desde la derecha en 250 ms. Se respeta `prefers-reduced-motion`.
- **Íconos:** set propio de 20 íconos lineales (grilla de 24px, trazo 1.75, extremos redondeados), en tamaños 16 / 20 / 24. Heredan `currentColor`. Sin emoji y sin mezclar con otros sets.
- **Marca:** todavía no hay logo. El nombre se escribe en Bricolage Grotesque 700 en `ink`.

### 2.9 Accesibilidad

- Toda acción es alcanzable con teclado y muestra `focus-ring`.
- El precio de oferta, la valoración y los estados se anuncian completos a los lectores de pantalla: *Precio oferta $19.990, precio normal $27.990*; *4,6 de 5 estrellas, 128 opiniones*.
- Los bordes de controles, íconos y foco tienen un contraste de al menos 3:1.
- Los campos con error llevan `aria-invalid="true"` y `aria-describedby` hacia su mensaje. El rechazo de pago se anuncia con `role="alert"`, y la espera y "Copiado" con `role="status"`.

### 2.10 Componentes

Son componentes React 18 expuestos en `window.Almacen` (`components/bundle.js`). Los estilos están en `components/bundle.css`, con clases de prefijo `al-`. Los precios van en CLP como enteros.

| Grupo | Componente | Props principales | Reglas clave |
|---|---|---|---|
| Acciones | `Button` | `variant` (`primary` · `secondary` · `ghost`), `size` (`sm` · `md` · `lg`), `block`, `loading`, `iconStart`, `iconEnd`, `href` | Un solo `primary` por vista. `lg` para comprar en la ficha y el checkout. Con `loading` mantiene el ancho y usa gerundio (*Agregando*). `disabled` solo si la acción es imposible. |
| | `IconButton` | `icon`, `label` (obligatorio), `variant` (`secondary` · `ghost`), `size`, `pressed` | Solo para favoritos, buscar, cuenta, carro y cerrar. `pressed` es un toggle (corazón relleno en `brand`). |
| | `FilterChip` | `selected` / `defaultSelected`, `onChange`, `count` | Seleccionado se invierte a `ink` con check. Para filtros excluyentes se usa select o radios. |
| Producto | `Badge` | `tone` (`neutral` · `new` · `sale` · `success` · `warning` · `danger`), `icon` | Máximo una insignia de marketing por tarjeta. Los tonos de estado siempre llevan ícono. |
| | `Price` | `amount`, `compareAt`, `size`, `unit`, `showDiscount` | En oferta: precio en `sale`, el anterior tachado y la insignia −N%. No escribir "Antes/Ahora". |
| | `Rating` | `value` (0–5), `count`, `size`, `showValue` | Siempre con conteo. Sin opiniones, el componente se omite. |
| | `VariantPicker` | `label`, `type` (`size` · `color`), `options` (`value`, `label`, `color`, `disabled`), `value` / `defaultValue`, `onChange` | La leyenda repite la opción (*Color: Arena*). Las variantes agotadas siguen visibles. |
| | `ProductCard` | `title`, `brand`, `href`, `image`, `imageAlt`, `price`, `compareAt`, `rating`, `reviewCount`, `badge`, `badgeTone`, `soldOut`, `wishlisted`, `onAdd`, `adding`, `addLabel` | Toda la tarjeta enlaza a la ficha. El botón es `secondary`. Agotado: insignia, imagen atenuada y *Sin stock*. |
| Carro y checkout | `QuantityStepper` | `value` / `defaultValue`, `min`, `max`, `onChange`, `size`, `label` | En el mínimo, el "−" se deshabilita (para quitar se usa *Eliminar*). Si se supera `max`, se ajusta al máximo y se avisa con un `Notice` warning. |
| | `CartItem` | `title`, `variant`, `image`, `href`, `price` (unitario), `compareAt`, `quantity`, `max`, `onQuantityChange`, `onRemove` | Muestra precio × cantidad (y *c/u* si hay más de una unidad). *Eliminar* es un enlace discreto; después se ofrece deshacer. |
| | `FreeShippingBar` | `subtotal`, `threshold` | *Te faltan $5.010 para el despacho gratis* → *Tu pedido tiene despacho gratis*. Una por vista. |
| | `OrderSummary` | `subtotal`, `discount`, `discountLabel`, `shipping` (`null` = *Por calcular*, `0` = *Gratis*), `itemsCount`, `ctaLabel`, `onCheckout`, `loading`, `note` | Calcula el total: subtotal − descuento + despacho. Los ahorros van en `success`, nunca en `sale`. |
| Formularios y avisos | `TextField` | `label`, `hint`, `error` + atributos de `<input>` | La etiqueta siempre va visible arriba. El error aparece al salir del campo. Usar `autoComplete` e `inputMode="numeric"` (RUT, teléfono). |
| | `Notice` | `tone` (`info` · `success` · `warning` · `danger`), `title`, `icon`, `action` | `danger` usa `role="alert"`; el resto, `role="status"`. Fondo `*-soft`, sin borde lateral. |
| Fundamentos | `Icon` | `name`, `size`, `label`, `strokeWidth`, `filled` | Íconos: `cart` `heart` `star` `plus` `minus` `check` `close` `trash` `truck` `returns` `alert` `info` `search` `tag` `image` `lock` `user` `menu` `chevronRight` `chevronDown`. |
| | `formatCLP(amount)` | — | Devuelve `"$12.490"`. |

No hay un componente `Select`: los templates arman los selects (Región, Comuna, Ordenar por) con la clase `al-field__input` y un `Icon` `chevronDown`. Los errores de un select usan `al-field--error` y `al-field__error`.

---

## 3. Piezas globales

| Pieza | Contenido |
|---|---|
| **Header (escritorio)** | Franja `promo` (*Despacho gratis sobre $39.990 a todo Chile*); logotipo "Almacén"; navegación (Novedades, Cerámica, Textiles, Velas y aromas, Cocina, Ofertas); buscador redondeado; `IconButton` de cuenta y favoritos; carro con contador en `brand`. |
| **Header (móvil)** | Franja promo; menú hamburguesa; logotipo; buscar; carro con contador (área de 44px). |
| **Footer** | Fondo `surface-sunken`; descripción de la marca; suscripción por correo; columnas *Tienda*, *Ayuda* y *Almacén*. La línea legal es `© 2026 Almacén · Almacén SpA · RUT 76.543.210-3`, junto a *Pago seguro con tarjeta de crédito, débito o transferencia*. La razón social y el RUT son ajustables en el diseño (sección "Datos legales"). Tiene una variante móvil. |
| **Header/footer del checkout** | Versión reducida: logotipo, *Pago seguro* con candado y *Volver al carro* (sin enlace mientras se procesa el pago). El footer solo trae enlaces legales y de ayuda. Sin navegación, para no distraer del pago. |

---

## 4. Templates

Las 40 pantallas del canvas de Templates. Las de escritorio son fluidas (ancho de referencia 1280px) y las móviles miden 390px de ancho.

### 4.1 Flujo de compra

| Template | Archivos | Estructura |
|---|---|---|
| **Inicio** | `Main` / `InicioMovil` | Hero de campaña en `promo` (`display-xl`, *Ver novedades* primary + *Ver ofertas* secondary) · 3 beneficios (despacho gratis, 30 días para cambios, pago seguro) · *Explora por categoría* (4 tarjetas 4:5) · *Lo nuevo* (4 `ProductCard`) · banner de oferta en `sale-soft` (*Hasta −30% en textiles*) · *Los más vendidos*. |
| **Listado** | `Listado` / `ListadoMovil` | Migas de pan · título de categoría (`display`) con conteo · filtros a la izquierda con `FilterChip` (Tipo, Color, Precio, Disponibilidad) · ordenar por (Destacados, Menor precio, Mayor precio, Novedades, Mejor evaluados) · filtros activos con *Limpiar filtros* · grilla de `ProductCard` · *Mostrando 8 de 12* con barra de progreso y *Cargar más productos*. |
| **Ficha de producto** | `Ficha` / `FichaMovil` | Migas de pan · galería (miniaturas verticales + imagen 4:5 con `Badge`) · columna fija: marca (`overline`), nombre (`heading-lg`), `Rating`, `Price lg`, `VariantPicker` de color, `Badge` warning de stock bajo, `QuantityStepper` + *Agregar al carro* (primary lg) + favorito · bloque de entrega (fecha, comuna, despacho gratis, cambios en 30 días) · Descripción (incluye el origen de la pieza) y Detalles (material, capacidad, medidas, cuidado, SKU en mono) · Opiniones · *Te podría gustar*. |
| **Carro · drawer** | `CarroDrawer` | Se abre tras agregar un producto. Drawer derecho de 440px sobre `scrim`: `Notice` success (*Agregaste … al carro*), `FreeShippingBar`, `CartItem`s, subtotal, nota (*El despacho y los cupones se calculan en el siguiente paso*), *Ir a pagar* (primary) y *Ver carro* (secondary). |
| **Carro** | `Carro` / `CarroMovil` | *Tu carro · N productos* + *Seguir comprando* · `FreeShippingBar` · `CartItem`s · cupón (`TextField` + *Aplicar cupón*) · resumen fijo (subtotal, despacho, total, *Ir a pagar*, nota de pago seguro) · fecha de llegada y cambios en 30 días · *Te podría gustar*. |
| **Checkout** | `Checkout` / `CheckoutMovil` | Ver el detalle en la sección 5.2. |
| **Confirmación** | `Confirmacion` / `ConfirmacionMovil` | Check en `success-soft` · *Pedido N.º 10482* (mono) · *Gracias, tu pedido está confirmado* · correo de la boleta · tarjeta de entrega con fecha y dirección · *Qué viene ahora* (3 pasos; la entrega es entre las 9:00 y las 20:00) · `Notice` para crear una cuenta · *Seguir comprando* (primary) y *Ver estado del pedido* · detalle del pedido a la derecha (*Total pagado*, *Pagado con tarjeta de débito vía Webpay Plus · Boleta electrónica*). |

### 4.2 Cuenta

| Template | Archivos | Estructura |
|---|---|---|
| **Ingresar o crear cuenta** | `Ingresar` / `IngresarMovil` | Dos columnas. **Ingresar**: correo, contraseña, *¿Olvidaste tu contraseña?*, *Ingresar* (primary) y el enlace *comprar como invitado*. **Crear cuenta** (fondo `promo`): beneficios, nombre, correo, contraseña (mínimo 8 caracteres), opción de novedades, *Crear cuenta* (secondary) y aviso legal. |
| **Mis pedidos** | `MisPedidos` / `MisPedidosMovil` | Menú de cuenta (Mis pedidos, Direcciones, Favoritos, Datos personales, Cerrar sesión) · lista de pedidos con número, `Badge` de estado, fecha de compra, miniaturas, fecha de entrega, resumen, total y *Ver detalle*. |
| **Detalle de pedido** | `DetallePedido` / `DetallePedidoMovil` | Migas de pan · número + `Badge` de estado · tarjeta de seguimiento (*Despacha Starken*, código de seguimiento, *Seguir el envío*) con línea de tiempo de 4 pasos · productos con *Volver a comprar* · dirección, pago (*Tarjeta de débito vía Webpay Plus*) y totales · *Descargar boleta* y *Necesito ayuda con este pedido*. |

### 4.3 Contenido y estados

| Template | Archivos | Estructura |
|---|---|---|
| **Página de contenido** (ej.: *Despacho y plazos*) | `Contenido` / `ContenidoMovil` | Migas de pan · menú de Ayuda · artículo de hasta 760px: título, fecha de actualización, secciones, tabla de plazos y costos por zona (sección 5.3), preguntas frecuentes en `<details>` y `Notice` de contacto (*hola@almacen.cl*, respuesta en menos de un día hábil). |
| **Búsqueda sin resultados** | `SinResultados` / `SinResultadosMovil` | Ícono de búsqueda · *No encontramos resultados para "…"* · consejo · buscador con la consulta · *Búsquedas populares* (chips) · *Te podría interesar*. |
| **Carro vacío** | `CarroVacio` / `CarroVacioMovil` | Ícono de carro · *Tu carro está vacío* · recordatorio del despacho gratis · *Explorar la tienda* (primary) y *Ver mis favoritos* · *Novedades*. |
| **Página no encontrada (404)** | `NoEncontrada` / `NoEncontradaMovil` | *Error 404* (mono) · *No encontramos esta página* · buscador · *Volver al inicio* (primary) · chips de categorías. |

### 4.4 Estados del pago

| Template | Archivos | Estructura |
|---|---|---|
| **Checkout · errores en el formulario** | `CheckoutErrores` / `CheckoutErroresMovil` | **Escritorio**: paso Despacho con un `Notice` danger *Revisa 5 datos para continuar*, con enlaces a Nombre, RUT, Teléfono, Comuna, y Calle y número. Cada campo muestra su error (ver la tabla de la sección 5.4). El despacho a domicilio dice *Elige tu comuna para ver la fecha de entrega*. **Móvil**: paso Pago con factura, *Revisa 3 datos para pagar*: Razón social, RUT de la empresa y Términos y condiciones (*Acepta los términos para poder pagar*). |
| **Checkout · procesando el pago** | `CheckoutProcesando` / `CheckoutProcesandoMovil` | Paso Pago con `aria-busy`. Los fieldsets (medio de pago, documento y términos) quedan deshabilitados. Botón *Pagando* en `loading`, más la línea `role="status"`: *Te estamos llevando a Webpay Plus para pagar $43.960. No cierres ni actualices esta página.* (en móvil, *…a Flow…*). *Volver al carro* queda sin enlace. |
| **Pago rechazado · Webpay Plus** | `PagoRechazado` / `PagoRechazadoMovil` | Bloque `role="alert"` con ícono `alert` en `danger-soft`, *Pedido N.º 10482 · Webpay Plus* y *Tu pago fue rechazado*. Causa: *El banco no autorizó la compra en Webpay Plus. No hicimos ningún cargo a tu tarjeta.* · `Notice` info *Tu pedido sigue guardado* · *Qué puedes hacer*: 1) Prueba con otra tarjeta, 2) Revisa con tu banco, 3) Paga por transferencia · *Elige cómo pagar*, con el medio anterior preseleccionado · *Reintentar pago $43.960* (primary) + *Volver al carro* (ghost) · contacto si ves un cargo (*hola@almacen.cl*) · resumen con *Total por pagar*. |
| **Pago no completado · Flow** | `PagoRechazadoFlow` | Es el mismo template con `caso="flow"`: *Tu pago en Flow no se completó*. Causa: *El pago se canceló o se acabó el tiempo para completarlo en Flow. No hicimos ningún cargo.* Caminos: 1) Vuelve a intentarlo en Flow, 2) Paga con tarjeta en Webpay Plus, 3) Paga por transferencia. |
| **Transferencia pendiente** | `TransferenciaPendiente` / `TransferenciaPendienteMovil` | `Badge` warning *Pago pendiente* + *Pedido N.º 10482* · *Transfiere $43.960 para confirmar tu pedido* · reserva de 48 horas *hasta el sábado 24 de octubre a las 22:00* (también enviado por correo) · *Datos para transferir* con *Copiar* por fila y *Copiar todos los datos* (cambian a *Copiado* y lo anuncian con `role="status"`) · `Notice` warning con el monto exacto, el mensaje *Pedido 10482* y la anulación sin costo si no llega a tiempo · *Qué viene ahora* (transferir → confirmamos en menos de un día hábil → despachamos) · *Pagar con tarjeta en su lugar* (secondary) y *Ver estado del pedido* (ghost) · resumen con *Total a transferir*. |
| **Botones · reposo y espera** | `EstadosBotones` | Tabla interactiva de los botones con `loading`: *Agregar al carro → Agregando* (ficha) · *Aplicar cupón → Aplicando* (carro) · *Continuar al pago → Guardando* (checkout, despacho) · *Pagar $43.960 → Pagando* (checkout, pago) · *Ingresar → Ingresando* · *Suscribirme → Suscribiendo* (footer). |

---

## 5. Flujo de compra

### 5.1 Recorrido

```
Inicio ──► Listado (categoría / búsqueda) ──► Ficha de producto
                │                                   │
                └─► Sin resultados                  │ Agregar al carro (Agregando)
                                                    ▼
                                         Carro · drawer ──► Ver carro ──► Carro
                                                    │                        │
                                                    └──── Ir a pagar ◄───────┘
                                                              │
                                    (opcional) Ingresar / comprar como invitado
                                                              ▼
                     Checkout: 1 Contacto ─► 2 Despacho ─► 3 Pago
                                  │ datos incompletos: Notice "Revisa N datos"
                                  │ Continuar al pago (Guardando)
                                                              │ Pagar $TOTAL (Pagando)
                         ┌────────────────────┬───────────────┴──────────────┐
                         ▼                    ▼                              ▼
                  Webpay Plus /          Rechazado o                Transferencia
                  Flow aprobado          no completado              (pendiente, 48 h)
                         │                    │ Reintentar /                 │ pago recibido
                         │                    │ cambiar medio                │
                         ▼                    └──► (vuelve a pagar)          ▼
                  Confirmación de pedido ◄───────────────────────────────────┘
                         │
              Mis pedidos ─► Detalle de pedido
```

| # | Paso | Acción principal (`primary`) | Salidas secundarias |
|---|---|---|---|
| 1 | Inicio | *Ver novedades* | Categorías, *Ver ofertas*, tarjetas de producto |
| 2 | Listado | Abrir el producto (la tarjeta completa) | Filtros, orden, *Cargar más productos* |
| 3 | Ficha | *Agregar al carro* | Favoritos, variantes, cantidad, opiniones |
| 4a | Carro · drawer | *Ir a pagar* | *Ver carro*, cerrar |
| 4b | Carro | *Ir a pagar* | *Seguir comprando*, *Aplicar cupón*, cambiar cantidad o eliminar |
| 5 | Checkout | *Continuar al pago* → *Pagar $TOTAL* | *Editar* en cada paso completado, *Volver al carro* |
| 5a | Pago rechazado / no completado | *Reintentar pago $TOTAL* (o *Pagar* / *Ver datos para transferir* si cambia el medio) | *Volver al carro* |
| 5b | Transferencia pendiente | — (la acción es transferir desde el banco) | *Pagar con tarjeta en su lugar*, *Ver estado del pedido* |
| 6 | Confirmación | *Seguir comprando* | *Ver estado del pedido*, *Crear cuenta* |

### 5.2 Checkout en detalle

Página dedicada con header y footer reducidos. El indicador de pasos muestra cada paso como listo (check en `success`), actual (`aria-current="step"`, número en `brand`) o pendiente.

1. **Contacto**: correo, donde se envían la boleta y el seguimiento. Se puede *Editar*.
2. **Despacho**
   - Campos: Nombre, Apellido, RUT (*Lo usamos para emitir tu boleta*), Teléfono (*Solo para coordinar la entrega*), Región, Comuna, Calle y número, Depto./casa/oficina (opcional). Usan `autoComplete`, y el RUT usa `inputMode="numeric"`.
   - Tipo de despacho (radios con fecha y costo):
     - Despacho a domicilio: *Llega el martes 27 de octubre*, **Gratis**.
     - Despacho express: *Llega mañana, viernes 23 de octubre, si pagas antes de las 14:00*, **$4.990**.
     - Retiro en tienda Almacén Providencia: *Disponible desde el lunes 26 de octubre*, **Gratis**.
   - *Continuar al pago* (primary lg). Al presionarlo pasa a *Guardando* (`loading`) y luego abre el paso 3. Si faltan datos, se ve el estado de errores (sección 4.4).
   - Mientras tanto, el paso 3 aparece desactivado (*Elige cómo pagar cuando completes el despacho*).
3. **Pago**
   - El despacho queda resumido (tipo, fecha, costo, nombre y dirección), con *Editar*.
   - Medio de pago:
     - **Tarjeta de crédito o débito**: *Pagarás en Webpay Plus, de forma segura.*
     - **Otros medios con Flow**: *Pagarás en Flow con el medio que elijas allí.*
     - **Transferencia bancaria**: *Te enviamos los datos por correo y reservamos tu pedido por 48 horas.*
   - Documento tributario: Boleta / Factura. La factura pide Razón social, RUT de la empresa y Giro.
   - Aceptación de términos y condiciones y de la política de privacidad (obligatoria).
   - *Pagar $43.960* (primary lg, ícono `lock`) → *Pagando* y redirección a Webpay Plus o Flow (estado *procesando*, sección 4.4).
4. **Resumen lateral (escritorio)**: productos con cantidad, subtotal, despacho, total, *¿Tienes un cupón de descuento?* (vuelve al carro) y *Pago seguro con Webpay Plus, Flow o transferencia*.

**Móvil:** el resumen se pliega arriba (*Ver resumen del pedido* + total). Una barra muestra *Paso 3 de 3 · Pago*, y los pasos completados se reducen a una línea con check y *Editar*. El botón *Pagar* ocupa todo el ancho.

### 5.3 Reglas de negocio que muestra el diseño

**Precios y despacho**

- **Despacho gratis sobre $39.990** (umbral de `FreeShippingBar`, header, ficha y contenido).
- Despacho con **Starken** a todo Chile continental:

  | Zona | Plazo | Costo |
  |---|---|---|
  | Región Metropolitana | 1 a 2 días hábiles | $3.990 |
  | Regiones | 3 a 5 días hábiles | $6.990 |
  | Compras sobre $39.990 | Según la zona | Gratis |

  Los días hábiles se cuentan desde que se confirma el pago.
- Despacho express: $4.990, llega al día siguiente si se paga antes de las 14:00. Retiro gratis en la tienda Almacén Providencia.
- Entrega entre las 9:00 y las 20:00. Si no hay nadie, Starken intenta una segunda vez al día hábil siguiente. Después, el paquete queda 5 días hábiles en la sucursal más cercana.
- La dirección se puede cambiar mientras el pedido no haya salido a despacho (por correo a *hola@almacen.cl*).
- El costo de despacho y los cupones se calculan en el checkout; el drawer solo muestra el subtotal. El cupón se aplica en el carro.
- Total = subtotal − descuento + despacho (`OrderSummary`).
- **Cambios y devoluciones en 30 días** desde que se recibe el pedido.

**Stock y cuenta**

- La cantidad máxima es el stock disponible (`QuantityStepper max`). Con stock bajo se muestra *Quedan N unidades de este color*.
- Las variantes agotadas siguen visibles pero no se pueden elegir. Un producto agotado muestra *Sin stock* en la tarjeta.
- Se puede comprar como invitado; crear cuenta se ofrece en el login y en la confirmación.

**Pagos**

- Los pagos se hacen con **Webpay Plus** (tarjetas), **Flow** (otros medios) o **transferencia**.
- Si el pago falla, el pedido **no se pierde**: se conservan los productos, la dirección y el despacho gratis, y se informa que no hubo cargo.
- La transferencia reserva el stock **48 horas** (fecha y hora exactas). Se transfiere el monto exacto, con el mensaje *Pedido N.º*.
  - Si no llega a tiempo, se liberan los productos y el pedido se anula sin costo.
  - El pago se confirma por correo en menos de un día hábil.
- Datos bancarios del diseño: Banco de Chile, cuenta corriente 00-123-45678-09, titular Almacén SpA, RUT 76.543.210-3, correo *pagos@almacen.cl*. **Hay que confirmarlos antes de producción.**

**Pedidos**

- Estados en *Mis pedidos*: **En preparación** (`neutral` + `info`), **En camino** (`new` + `truck`) y **Entregado** (`success` + `check`). El seguimiento tiene 4 pasos: Confirmado → Preparado → En camino → Entregado. Una transferencia sin pagar se marca como **Pago pendiente** (`warning`).

### 5.4 Mensajes de error definidos

| Campo / caso | Mensaje |
|---|---|
| Nombre vacío | *Escribe tu nombre.* |
| RUT (persona o empresa) | *Revisa el dígito verificador: es el número o la K después del guion.* |
| Teléfono incompleto | *Faltan dígitos. Escribe los 9 números de tu celular, por ejemplo +56 9 1234 5678.* |
| Comuna sin elegir | *Elige la comuna para calcular la fecha de entrega.* |
| Calle sin número | *Agrega el número de la calle, por ejemplo Av. Providencia 1234.* |
| Razón social vacía | *Escribe la razón social de la empresa, tal como aparece en el SII.* |
| Términos sin aceptar | *Acepta los términos para poder pagar.* |
| Resumen de errores | *Revisa N datos para continuar* (despacho) / *Revisa N datos para pagar* (pago) |
| Rechazo en Webpay Plus | *Tu pago fue rechazado* · *El banco no autorizó la compra en Webpay Plus. No hicimos ningún cargo a tu tarjeta.* |
| Pago no completado en Flow | *Tu pago en Flow no se completó* · *El pago se canceló o se acabó el tiempo para completarlo en Flow. No hicimos ningún cargo.* |

### 5.5 Lo que sigue sin diseño

- **Toast de producto agregado** (`z-toast`): el token existe, pero ninguna pantalla lo muestra (el drawer cumple ese rol con su `Notice`).
- **Pago no completado en Flow, versión móvil**: `PagoRechazadoMovil` admite los dos casos (Webpay y Flow), pero solo escritorio tiene un artboard aparte para el caso de Flow.
- **Opiniones de clientes**: siguen con placeholders (`[Opinión del cliente…]`, `[Nombre] · [Comuna] · [Fecha]`) en la ficha.
- **Canvas "Flujo de compra"**: le siguen faltando 11 de sus 15 pantallas (sección 1).

---

## 6. Notas para implementar en este proyecto

- El proyecto usa **CSS Modules + `globals.css`** (sin Tailwind): conviene declarar los tokens como variables CSS (`--surface`, `--ink`, `--brand`, `--radius-lg`, `--font-sans`…, los mismos nombres que usan los templates) en `globals.css`, con el tema oscuro bajo `prefers-color-scheme: dark`.
- Los componentes del design system están hechos para **React 18** en un bundle global (`window.Almacen`), mientras que el proyecto usa **React 19** con App Router. Hay que portarlos como componentes propios (por ejemplo, en `src/components/`), no cargar el bundle. También falta un `Select` (sección 2.10).
- Las fuentes (Bricolage Grotesque e Instrument Sans) se pueden cargar con `next/font/google`.
- El carro de Zustand (`CartItem`: `id`, `name`, `price`, `quantity`) todavía no tiene `variant`, `image`, `compareAt` ni `max`, que el diseño sí muestra.
- El esquema SQL ya tiene las tablas de cupones, órdenes, pagos e inventario, que respaldan el cupón, el número de pedido, los estados y el stock del diseño. Faltaría representar la **reserva de 48 horas** de la transferencia y su anulación automática.
- **Pagos:** el diseño coincide con los servidores MCP del proyecto (`.mcp.json`): `transbank` (Webpay Plus, ambiente de integración) y `flow` (sandbox). Cómo mapear las respuestas a las pantallas:
  - **Webpay Plus** → *Confirmación* solo si `response_code == 0` y `status == AUTHORIZED`; cualquier otro resultado → *Pago rechazado (Webpay)*. Si el usuario vuelve con `TBK_TOKEN` (pago abortado), no se hace commit; el diseño no tiene un texto propio para ese caso, así que habría que usar la pantalla de rechazo o adaptar la de Flow.
  - **Flow** → estado `2` (pagada) → *Confirmación*; `3` (rechazada) o `4` (anulada) → *Pago no completado (Flow)*; `1` (pendiente) → mantener *procesando* y consultar `getStatus`.
- Los canvas de diseño tienen instalada la versión `1792708668-3de7` del design system, y la versión actual es `1792718261-9f4b`. El último cambio registrado del sistema es solo el manual (patrones de pago); `tokens.json` y el bundle mantienen el mismo tamaño.
