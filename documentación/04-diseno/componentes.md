---
title: "Componentes del design system Almacén"
description: "Los 15 componentes (Button, IconButton, FilterChip, Badge, Price, Rating, VariantPicker, ProductCard, QuantityStepper, CartItem, FreeShippingBar, OrderSummary, TextField, Notice, Icon) más formatCLP: props, reglas y de qué datos se alimentan."
keywords: ["componentes", "Button", "IconButton", "FilterChip", "Badge", "Price", "Rating", "VariantPicker", "ProductCard", "QuantityStepper", "CartItem", "FreeShippingBar", "OrderSummary", "TextField", "Notice", "Icon", "formatCLP", "Select", "props"]
related: ["04-diseno/tokens.md", "06-implementacion/portar-design-system.md", "04-diseno/templates.md"]
source: ["_archivo/diseno-almacen.md §2.10", "artifact del design system: project/components/bundle.js, index.d.ts, bundle.css (versión 1792726192-c055)", "src/components/ui/"]
estado: "vigente (portados a src/components/ui/ en la fase 2)"
---

# Componentes

> **Úsalo cuando:** vas a construir o usar un componente de UI. Respeta las props y las reglas: son el contrato del diseño.

En el artifact, los componentes son de React 18 y se exponen en `window.Almacen` (`components/bundle.js`), con estilos en `components/bundle.css` (prefijo `al-`). **En este proyecto están portados** a `src/components/ui/`: un archivo por componente (`button.tsx` + `button.module.css`), con las mismas props. Los precios son CLP enteros. Para verlos todos en claro y oscuro: `npm run dev` → `/diseno` (en producción responde 404).

## Implementación en el proyecto

| Archivo | Componente | Tipo | Notas del port |
|---|---|---|---|
| `icon.tsx` | `Icon`, `ICON_NAMES`, `IconName` | Server | Mismos 20 trazos del bundle |
| `button.tsx` | `Button` | Server (sirve en ambos) | `href` → `next/link`. En `loading`: `aria-busy`, `aria-disabled`, `type="button"` y sin `onClick` (tampoco responde al teclado ni reenvía el formulario) |
| `icon-button.tsx` | `IconButton` | Server | Agrega `href` (enlace) para cuenta, favoritos y carro del header. Área táctil de 44px en pantallas táctiles sin cambiar el tamaño visible |
| `filter-chip.tsx` | `FilterChip` | Client | |
| `badge.tsx` | `Badge` | Server | |
| `price.tsx` | `Price`, `discountPercent` | Server | |
| `rating.tsx` | `Rating`, `ratingLabel` | Server | |
| `variant-picker.tsx` | `VariantPicker` | Client | |
| `product-card.tsx` | `ProductCard` | Client | `href` obligatorio (`next/link`). `Rating` solo si hay `reviewCount`. Con `adding`, el botón dice *Agregando*. Imagen con `<img>`: `next/image` se decide en la fase 3 |
| `quantity-stepper.tsx` | `QuantityStepper`, `clampQuantity` | Client | Ajusta al máximo; el `Notice` de aviso lo pone quien lo usa |
| `cart-item.tsx` | `CartItem` | Client | |
| `free-shipping-bar.tsx` | `FreeShippingBar` | Server | Umbral: `STORE.freeShippingThreshold` (`src/lib/store.ts`) |
| `order-summary.tsx` | `OrderSummary`, `orderTotal` | Client | Agrega `ctaHref` para que *Ir a pagar* sea un enlace. Solo muestra: el total real lo calcula `place_order` |
| `text-field.tsx` | `TextField` | Client (`useId`) | |
| `text-area.tsx` | **`TextArea`** (nuevo, 7.6) | Client (`useId`) | No existe en el design system. Misma API que `TextField` para un `<textarea>` (`rows` = 5 por defecto); estilos `.input` + `.textarea` de `field.module.css`. Lo usa *Escribe tu opinión* |
| `select.tsx` | **`Select`** (nuevo) | Client (`useId`) | No existe en el design system. Misma API que `TextField` + `options` y `placeholder` (opción vacía deshabilitada) |
| `notice.tsx` | `Notice` | Server | |
| `field.module.css` | — | — | Estilos de campo compartidos: `TextField`, `Select`, buscador del header y newsletter del footer |
| `cx.ts` | `cx()` | — | Une clases |
| `@/lib/format/clp` | `formatCLP` | — | Los negativos usan el signo menos tipográfico (`−$5.000`), igual que el bundle |

"Server" significa que no usa estado ni efectos: se puede usar en Server Components (sin pasarle funciones) y en Client Components. La clase global `.sr-only` (en `globals.css`) reemplaza a `.al-sr`.

## Acciones

| Componente | Props | Reglas |
|---|---|---|
| `Button` | `variant` (`primary` · `secondary` · `ghost`), `size` (`sm` · `md` · `lg`), `block`, `loading`, `iconStart`, `iconEnd`, `href` | Un solo `primary` por vista. `lg` para comprar (Ficha y checkout). Con `loading`: **mantiene el ancho**, muestra el verbo en gerundio y no acepta otro clic. `disabled` solo si la acción es imposible: con datos incompletos el botón **sigue activo** y muestra los errores. Con `href` se renderiza como enlace (usa `next/link`) |
| `IconButton` | `icon`, **`label`** (obligatorio, para `aria-label`), `variant` (`secondary` · `ghost`), `size`, `pressed` | Solo para favoritos, buscar, cuenta, carro y cerrar. `pressed` es un toggle (`aria-pressed`): el corazón se rellena con `brand` |
| `FilterChip` | `selected` / `defaultSelected`, `onChange`, `count` | Seleccionado: se invierte a `ink` con un check. Para filtros excluyentes usa radios o un select |

## Producto

| Componente | Props | Reglas | Datos |
|---|---|---|---|
| `Badge` | `tone` (`neutral` · `new` · `sale` · `success` · `warning` · `danger`), `icon` | Máximo una insignia de marketing por tarjeta. Los tonos de estado siempre llevan ícono | — |
| `Price` | `amount`, `compareAt`, `size`, `unit`, `showDiscount` | En oferta: el precio en `sale`, el anterior tachado y −N%. No escribas "Antes/Ahora". Lectores de pantalla: *Precio oferta $X, precio normal $Y* | `min_price` / `coalesce(variant.price, base_price)`, `compare_at_price` |
| `Rating` | `value` (0–5), `count`, `size`, `showValue` | Siempre con el conteo. **Sin opiniones, el componente no se muestra** | `avg_rating`, `review_count` |
| `VariantPicker` | `label`, `type` (`size` · `color`), `options` (`value`, `label`, `color`, `disabled`), `value` / `defaultValue`, `onChange` | La leyenda repite la opción (*Color: Arena*). Las variantes agotadas siguen visibles con `disabled` | `product_variants.attributes`, `stock` |
| `ProductCard` | `title`, `brand`, `href`, `image`, `imageAlt`, `price`, `compareAt`, `rating`, `reviewCount`, `badge`, `badgeTone`, `soldOut`, `wishlisted`, `onAdd`, `adding`, `addLabel` | Toda la tarjeta enlaza a la Ficha. El botón es `secondary`. Agotado: insignia, imagen atenuada y *Sin stock* | Una fila de `product_catalog` |

## Carro y checkout

| Componente | Props | Reglas |
|---|---|---|
| `QuantityStepper` | `value` / `defaultValue`, `min`, `max`, `onChange`, `size`, `label` | En el mínimo, "−" se deshabilita (para quitar se usa *Eliminar*). Si se supera `max`, se ajusta al máximo y se avisa con un `Notice warning` |
| `CartItem` | `title`, `variant`, `image`, `href`, `price` (unitario), `compareAt`, `quantity`, `max`, `onQuantityChange`, `onRemove` | Muestra precio × cantidad (y *c/u* si hay más de una unidad). *Eliminar* es un enlace discreto y después se ofrece deshacer |
| `FreeShippingBar` | `subtotal`, `threshold` | *Te faltan $5.010 para el despacho gratis* → *Tu pedido tiene despacho gratis*. Una por vista. `threshold = 39990` |
| `OrderSummary` | `subtotal`, `discount`, `discountLabel`, `shipping` (`null` = *Por calcular*, `0` = *Gratis*), `itemsCount`, `ctaLabel`, `onCheckout`, `loading`, `note` | Total = subtotal − descuento + despacho. Los ahorros van en `success`. **Solo para mostrar**: el total real sale de `orders.total` |

## Formularios y avisos

| Componente | Props | Reglas |
|---|---|---|
| `TextField` | `label`, `hint`, `error` + atributos de `<input>` | La etiqueta siempre visible arriba. El error aparece **al salir del campo** (blur), y también al enviar. Usa `autoComplete`, e `inputMode="numeric"` para RUT y teléfono. Con error: `aria-invalid` + `aria-describedby` |
| `Notice` | `tone` (`info` · `success` · `warning` · `danger`), `title`, `icon`, `action` | `danger` → `role="alert"`; los demás → `role="status"`. Fondo `*-soft`, sin borde lateral |

**No hay un componente `Select`.** Los templates arman los selects (Región, Comuna, Ordenar por) con la clase `al-field__input` + `Icon chevronDown`, y los errores con `al-field--error` / `al-field__error`. Al portar, crea `Select` con la misma API que `TextField`.

## Fundamentos

| Componente | Props | Notas |
|---|---|---|
| `Icon` | `name`, `size` (16/20/24), `label`, `strokeWidth`, `filled` | Sin `label` → `aria-hidden`. Los nombres están en [tokens.md](tokens.md#imágenes-movimiento-e-íconos) |
| `formatCLP(amount)` | — | `12490` → `"$12.490"`. Va en `src/lib/format/clp.ts` |

## Componentes de layout (en los templates, no en el design system)

`Header` (escritorio y móvil), `Footer`, `CheckoutHeader`/`CheckoutFooter`, `CartDrawer`, `Breadcrumbs`, `CheckoutSteps`, `ProductGallery`, `DeliveryInfo`. Su contenido está en [templates.md](templates.md#piezas-globales).

Del carro (fase 4, `src/components/cart/`): `CartDrawer`, `CartLines` (lista de `CartItem` con *Deshacer*), `UndoRemoveNotice`, `CartView` (Carro y Carro vacío), `CouponForm`. `DeliveryInfo` está en `src/components/catalog/delivery-info.tsx` y lo comparten la Ficha y el Carro. Ver [06-implementacion/carro.md](../06-implementacion/carro.md).
