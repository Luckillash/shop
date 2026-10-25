---
title: "Tokens del design system Almacén"
description: "Valores de color (claro/oscuro), tipografía, espaciado, tamaños, breakpoints, radios, sombras, z-index, imágenes, movimiento e íconos, y cómo declararlos como variables CSS en globals.css."
keywords: ["tokens", "colores", "color", "paleta", "tipografía", "fuentes", "Bricolage Grotesque", "Instrument Sans", "espaciado", "breakpoints", "radius", "sombras", "z-index", "dark mode", "variables css", "globals.css"]
related: ["04-diseno/componentes.md", "06-implementacion/portar-design-system.md", "04-diseno/principios-voz-y-accesibilidad.md"]
source: ["_archivo/diseno-almacen.md §2.4-§2.8, §6"]
estado: "vigente (aplicado en src/app/globals.css)"
---

# Tokens del design system

> **Úsalo cuando:** escribes CSS. No uses valores literales: usa `var(--token)`.

## Color

Hay dos temas: claro y oscuro (con `prefers-color-scheme: dark`). Todos los pares texto/fondo que se nombran cumplen WCAG AA.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `surface` | `#f7f5f0` | `#151513` | Fondo de página: listados, carro, checkout |
| `surface-raised` | `#ffffff` | `#1f1e1b` | Tarjetas, resumen del pedido, campos, menús, drawers |
| `surface-sunken` | `#ece8df` | `#0e0e0c` | Fondo de imágenes mientras cargan, barras de filtros, footer |
| `line` | `#dcd5c9` | `#34322d` | Bordes de tarjetas, divisores. Es decorativo: nunca es el único borde de un control |
| `line-strong` | `#857b6d` | `#7d766b` | Bordes de controles, estrellas vacías (≥ 3:1) |
| `ink` | `#1b1a17` | `#f2efe8` | Texto principal y títulos |
| `ink-muted` | `#5c564d` | `#ada699` | Texto secundario: marca, variantes, ayudas, precio anterior |
| `brand` | `#1f5a44` | `#7cc8a6` | Verde pino: acción principal, enlaces, progreso, anillo de foco |
| `brand-hover` | `#174735` | `#9ad6bb` | Hover y pressed de `brand` |
| `brand-soft` | `#e0ede6` | `#1b3a2f` | Insignia *Nuevo*, hover de `ghost`, ítem activo |
| `on-brand` | `#ffffff` | `#0f1f18` | Texto sobre `brand`. No uses blanco literal |
| `sale` | `#b9351b` | `#ff8a66` | Tomate: **solo** precios rebajados y % de descuento. **Nunca** para errores |
| `sale-soft` | `#fbe5dd` | `#4a1d12` | Banners de oferta |
| `on-sale` | `#ffffff` | `#1c0a05` | Texto sobre `sale` |
| `accent` | `#a66c00` | `#f0b53d` | Mostaza: estrellas y bloques de campaña. No se usa en texto de cuerpo |
| `promo` | `#efe4cf` | `#2e2a21` | Arena: banners de campaña, `FreeShippingBar`, franja del header |
| `success` | `#0b6b55` | `#5fcdb0` | Verde azulado (distinto de `brand`): en stock, despacho gratis, ahorro |
| `success-soft` | `#dcefe9` | `#123a31` | |
| `warning` | `#8a5a00` | `#f2c063` | Últimas unidades, retrasos, pago pendiente |
| `warning-soft` | `#fbefd3` | `#3d2c0b` | |
| `danger` | `#b3261e` | `#ff8b82` | Errores de formulario, pago rechazado |
| `danger-soft` | `#fbe3e1` | `#4a1714` | |
| `scrim` | `#1b1a1799` | `#000000b3` | Velo detrás del drawer y de los modales |
| `link` | = `brand` | = `brand` | Enlaces en texto corrido |

`success` tira hacia el azul para que se distinga de `danger` con daltonismo. Los ahorros (descuento, despacho gratis) van en `success`, **no** en `sale`.

## Tipografía

| Familia | Variable | Stack | Carga |
|---|---|---|---|
| Titulares | `--font-display` | `"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif` | `next/font/google` |
| Interfaz | `--font-sans` | `"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | `next/font/google` |
| Código, SKU, N.º de pedido | `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | Del sistema |

| Estilo | Familia | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `display-xl` | display | 56/58 | 700 | −0.02em | Hero (uno por página) |
| `display` | display | 40/44 | 700 | −0.015em | Título de categoría y de páginas principales |
| `heading-lg` | display | 28/34 | 600 | −0.01em | Nombre del producto en la Ficha |
| `heading` | display | 22/28 | 600 | — | Secciones y carruseles |
| `heading-sm` | display | 18/24 | 600 | — | Tarjetas, drawers, pasos del checkout |
| `body-lg` | sans | 17/26 | 400 | — | Descripción en la Ficha |
| `body` | sans | 15/22 | 400 | — | Por defecto |
| `body-sm` | sans | 13/18 | 400 | — | Variantes, ayudas, metadatos |
| `label` | sans | 14/20 | 600 | — | Botones, etiquetas, chips |
| `caption` | sans | 12/16 | 500 | 0.01em | Notas legales, insignias |
| `overline` | sans | 11/16 | 600 | 0.08em | Marca, siempre en MAYÚSCULAS |
| `price-lg` | sans | 28/32 | 700 | −0.01em | Precio en la Ficha, total |
| `price` | sans | 18/24 | 700 | — | Precio en tarjetas |
| `price-sm` | sans | 14/20 | 600 | — | Carro, mini carro, resumen |
| `sku` | mono | 12/16 | 400 | — | SKU, número de pedido |

Reglas:

- Bricolage Grotesque **nunca** se usa en botones, precios ni formularios.
- Los precios llevan `font-variant-numeric: tabular-nums`.
- Las descripciones tienen un largo de línea máximo de 70 caracteres (`max-width: 70ch`).

## Espaciado, tamaños y layout

| Espaciado | Valor | Tamaño | Valor |
|---|---|---|---|
| `space-1` | 4px | `control-sm` | 32px (chips, cantidad en el carro) |
| `space-2` | 8px | `control-md` | 40px (botones y campos por defecto) |
| `space-3` | 12px | `control-lg` | 48px (*Agregar al carro*, *Ir a pagar*) |
| `space-4` | 16px | `touch-target` | 44px (mínimo táctil en móvil) |
| `space-5` | 20px | `thumb` | 72px (miniatura del carro, 4:5) |
| `space-6` | 24px | `container` | 1280px (ancho máximo) |
| `space-8` | 32px | | |
| `space-12` | 48px | | |
| `space-16` | 64px | | |

| Breakpoint (mobile first) | Valor | Qué cambia |
|---|---|---|
| `bp-sm` | 480px | Teléfonos grandes |
| `bp-md` | 768px | Grilla de 3 columnas; filtros en un panel lateral plegable; márgenes de `space-6` |
| `bp-lg` | 1024px | Grilla de 4 columnas; filtros fijos a la izquierda |
| `bp-xl` | 1280px | Se alcanza `container` |

- Grilla de productos: 2 columnas en móvil → 3 desde `bp-md` → 4 desde `bp-lg`. Gap: `space-4` en móvil, `space-6` en escritorio.
- Ficha: galería ≈ 7/12 + compra ≈ 5/12 (fija al hacer scroll). En móvil, una barra inferior fija (`shadow-sm`, `z-sticky`).
- Carro: la lista a la izquierda y `OrderSummary` fijo a la derecha. En móvil, el resumen va abajo.

> Las variables CSS no funcionan dentro de `@media`. Escribe los breakpoints como valores literales en las media queries (`@media (min-width: 768px)`).

## Forma, elevación y capas

| Radio | Valor | Uso |
|---|---|---|
| `radius-sm` | 4px | Insignias |
| `radius-md` | 8px | Botones, campos, avisos, miniaturas |
| `radius-lg` | 12px | Tarjetas, resumen, imágenes de la Ficha |
| `radius-xl` | 20px | Banners, drawers |
| `radius-full` | 9999px | Chips, stepper, botones de ícono, muestras de color |

| Sombra | Claro | Oscuro | Uso |
|---|---|---|---|
| `shadow-sm` | `0 1px 2px #1b1a170f, 0 1px 3px #1b1a1714` | `0 1px 3px #000000a6` | Barra fija móvil, header al hacer scroll |
| `shadow-md` | `0 2px 4px #1b1a170d, 0 8px 20px -4px #1b1a1724` | `0 8px 20px -4px #000000cc` | Hover de una tarjeta, menús, sugerencias del buscador |
| `shadow-lg` | `0 8px 16px #1b1a1714, 0 24px 48px -8px #1b1a1733` | `0 24px 48px -8px #000000e6` | Drawer del carro, modales |
| `focus-ring` | `0 0 0 2px #f7f5f0, 0 0 0 4px #1f5a44` | `0 0 0 2px #151513, 0 0 0 4px #7cc8a6` | 2px del color de la página + 2px de `brand` |

Primero se usan bordes y después sombras: en reposo, las tarjetas solo tienen un borde `line`. Valores tomados de `project/tokens.json` del artifact del design system.

| z-index | Valor | Uso |
|---|---|---|
| `z-sticky` | 100 | Barra fija de compra, filtros fijos |
| `z-header` | 200 | Header |
| `z-drawer` | 400 | Drawer del carro y su scrim |
| `z-modal` | 500 | Modales |
| `z-toast` | 600 | Toast de producto agregado (sin diseño) |

## Imágenes, movimiento e íconos

- **Producto:** 4:5, mínimo 1200 × 1500 px, fondo liso y cálido, el producto ocupa ≈ 70% del cuadro, sin texto encima. Mientras carga, el espacio se reserva con `surface-sunken`. El `alt` describe el producto.
- **Movimiento:** 150–200 ms `ease-out`, solo en color, borde, sombra y barras. El drawer entra desde la derecha en 250 ms. Se respeta `prefers-reduced-motion`.
- **Íconos:** un set propio de 20 íconos lineales (grilla de 24, trazo 1.75, extremos redondeados), en 16/20/24 px, que heredan `currentColor`: `cart heart star plus minus check close trash truck returns alert info search tag image lock user menu chevronRight chevronDown`. No mezcles otros sets ni uses emoji.
- **Marca:** sin logo. Se escribe "Almacén" en Bricolage Grotesque 700 con color `ink`.

## Cómo están declarados

✅ **Aplicados en `src/app/globals.css`** (fase 0): todos los tokens de color, espaciado, tamaños, radios, sombras y capas, en claro y oscuro con `prefers-color-scheme`. Las fuentes funcionan así:

- `layout.tsx` carga Bricolage Grotesque (`--font-bricolage`, con el eje `opsz`) e Instrument Sans (`--font-instrument`) con `next/font/google`.
- `globals.css` arma los stacks con fallbacks: `--font-display: var(--font-bricolage), ui-sans-serif, …` y `--font-sans: var(--font-instrument), ui-sans-serif, …`.
- El `body` usa `var(--font-sans)` 15/22, color `--ink` y fondo `--surface`. `:focus-visible` usa `--focus-ring` y se respeta `prefers-reduced-motion`.

Los estilos de tipografía (`display`, `heading`, `price`…) todavía no tienen clases utilitarias: se escriben en cada CSS Module con los valores de la tabla de arriba. Extracto original de referencia:

```css
:root {
  --surface: #f7f5f0;  --surface-raised: #ffffff;  --surface-sunken: #ece8df;
  --line: #dcd5c9;     --line-strong: #857b6d;
  --ink: #1b1a17;      --ink-muted: #5c564d;
  --brand: #1f5a44;    --brand-hover: #174735;     --brand-soft: #e0ede6;  --on-brand: #ffffff;
  --sale: #b9351b;     --sale-soft: #fbe5dd;       --on-sale: #ffffff;
  --accent: #a66c00;   --promo: #efe4cf;
  --success: #0b6b55;  --success-soft: #dcefe9;
  --warning: #8a5a00;  --warning-soft: #fbefd3;
  --danger: #b3261e;   --danger-soft: #fbe3e1;
  --scrim: #1b1a1799;  --link: var(--brand);
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 20px; --radius-full: 9999px;
  --control-sm: 32px; --control-md: 40px; --control-lg: 48px; --touch-target: 44px; --container: 1280px;
  --z-sticky: 100; --z-header: 200; --z-drawer: 400; --z-modal: 500; --z-toast: 600;
  /* fuentes y sombras: ver src/app/globals.css */
}
@media (prefers-color-scheme: dark) {
  :root {
    --surface: #151513;  --surface-raised: #1f1e1b;  --surface-sunken: #0e0e0c;
    --line: #34322d;     --line-strong: #7d766b;
    --ink: #f2efe8;      --ink-muted: #ada699;
    --brand: #7cc8a6;    --brand-hover: #9ad6bb;     --brand-soft: #1b3a2f;  --on-brand: #0f1f18;
    --sale: #ff8a66;     --sale-soft: #4a1d12;       --on-sale: #1c0a05;
    --accent: #f0b53d;   --promo: #2e2a21;
    --success: #5fcdb0;  --success-soft: #123a31;
    --warning: #f2c063;  --warning-soft: #3d2c0b;
    --danger: #ff8b82;   --danger-soft: #4a1714;
    --scrim: #000000b3;
  }
}
```
