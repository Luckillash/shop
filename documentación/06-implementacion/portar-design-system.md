---
title: "Guía: portar el design system Almacén a React 19 + CSS Modules"
description: "Cómo leer el artifact del design system, llevar los tokens a globals.css, cargar las fuentes con next/font, y reescribir los componentes en src/components/ui/ respetando sus props, con la lista de verificación por componente."
keywords: ["portar", "design system", "componentes", "css modules", "next/font", "Bricolage Grotesque", "Instrument Sans", "globals.css", "React 19", "bundle.js", "window.Almacen", "Select"]
related: ["04-diseno/componentes.md", "04-diseno/tokens.md", "02-arquitectura/decisiones.md"]
source: ["_archivo/diseno-almacen.md §2.10, §6", "src/app/layout.tsx", "node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md"]
estado: "vigente (fases 0 y 2 terminadas)"
---

# Guía: portar el design system

> **Úsalo cuando:** vas a crear o cambiar un componente de UI, o a agregar uno que el design system no tiene.

## Estado (2026-10-23)

- ✅ Fuentes y tokens (fase 0).
- ✅ Los 15 componentes + `Select` en `src/components/ui/`, con las mismas props del bundle. El detalle por archivo y las diferencias del port están en [04-diseno/componentes.md](../04-diseno/componentes.md#implementación-en-el-proyecto).
- ✅ Header, footer, header y footer del checkout, y los layouts `(tienda)` y `(checkout)`: ver [04-diseno/templates.md](../04-diseno/templates.md#piezas-globales).
- ✅ Tests unitarios de los componentes con lógica (`*.test.tsx` en `src/components/ui/`).
- ✅ Página `/diseno` con todos los componentes y estados (solo en `npm run dev`).
- ✅ **Revisión visual (2026-10-24):** `/diseno` comparado con el bundle original del artifact en claro y oscuro (1280 px) y en móvil (390 px). Coinciden en colores, tipografía, espaciado, radios, estados e íconos, sin errores de consola en ninguna de las dos páginas. También se revisaron el header, el menú móvil y el footer. Ver abajo.

## Revisión visual

**Cómo se hizo:** el bundle original (`bundle.js`, `bundle.css`, React 18 del artifact y tokens generados desde `tokens.json`) se montó en una página local con los mismos componentes y props que `/diseno`. Un script de `puppeteer-core` con el Edge del sistema capturó cada sección de las dos páginas y armó láminas lado a lado. El script quedó en el scratchpad de esa sesión, no en el repositorio; para repetirlo, el método es lo que importa.

**Diferencias encontradas y corregidas** (venían del diseño original, el bundle también las tiene):

| Problema | Corrección |
|---|---|
| En la grilla de 2 columnas a 390 px, *Agregar al carro* (ícono + padding md) no cabía y se salía de la `ProductCard` | Container query en `.foot`: bajo 180 px de ancho, el botón compacta el padding, usa 14 px y oculta el ícono (el spinner de *Agregando* se mantiene) |
| En un `OrderSummary` angosto, el descuento se cortaba entre "−" y "$5.000"; con poco ancho los montos se salían | `dd` con `white-space: nowrap` y `max-width: 360px` en el resumen (el bundle ya lo tenía) |

**Notas:**

- El círculo con una "N" que aparece en las capturas de desarrollo es el indicador de Next.js, no un componente.
- Al abrir el menú móvil, el botón sigue mostrando el ícono de menú (el diseño no define un estado abierto). Si se define, cambiar a `close` con `details[open]`.

## Cómo agregar un componente nuevo

1. Archivo `src/components/ui/<nombre>.tsx` + `<nombre>.module.css`, con export nombrado y props tipadas.
2. Sin estado ni efectos → sirve en Server Components; si necesita `useState`, `useId` o handlers → `"use client"`.
3. Solo `var(--token)`; nada de colores literales. `.sr-only` para texto de lectores de pantalla.
4. Agrégalo a `/diseno` con sus estados, y escribe un test si tiene lógica (cálculos, textos accesibles, estados).
5. Documéntalo en la tabla de [04-diseno/componentes.md](../04-diseno/componentes.md#implementación-en-el-proyecto).

## Por qué portar en vez de cargar el bundle

El artifact entrega componentes de React 18 en un bundle global (`window.Almacen`) con CSS global (`al-*`). El proyecto usa React 19, Server Components y CSS Modules. Cargar el bundle obligaría a que todo sea de cliente y duplicaría React. **Decisión D-006:** reescribir los componentes.

## 1. Leer la fuente

- Artifact del design system: https://claude.ai/artifact/8ueRvwVuopKWk3enu498tj. Léelo con la herramienta Artifact (`action: "read"`; con `path` puedes pedir archivos como `tokens.json`, `components/bundle.css` o `components/bundle.js`).
- Toma de ahí los valores exactos que no están en esta documentación (sombras, duraciones, SVG de los íconos).

## 2. Fuentes (`src/app/layout.tsx`)

```tsx
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

// <html lang="es-CL" className={`${display.variable} ${sans.variable}`}>
```

Lee `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` para confirmar la API. Reemplaza Geist y `font-family: Arial` en `globals.css` por `var(--font-sans)`.

## 3. Tokens

Pega el bloque de [04-diseno/tokens.md](../04-diseno/tokens.md#cómo-declararlos-propuesta-para-globalscss) en `globals.css`. Agrega las clases utilitarias de tipografía (`.t-display`, `.t-price`…) o mixins por estilo, con `font-variant-numeric: tabular-nums` en los precios.

## 4. Componentes

Un archivo por componente en `src/components/ui/`: `button.tsx` + `button.module.css`.

| Componente | Server/Client | Notas al portar |
|---|---|---|
| `Icon` | Server | SVG inline del set propio. `aria-hidden` sin `label` |
| `Badge`, `Price`, `Rating`, `Notice` | Server | `Price` usa `formatCLP` y el texto para lectores de pantalla |
| `Button` | Server (o Client si necesita `useFormStatus`) | `href` → `next/link`. `loading` mantiene el ancho (mide o reserva espacio). Crea un `SubmitButton` de cliente que lea `useFormStatus().pending` |
| `IconButton` | Server / Client según el uso | `label` obligatorio en el tipo |
| `FilterChip` | Client | O un enlace con `searchParams` si los filtros van en la URL (recomendado) |
| `VariantPicker` | Client | Radios accesibles (`fieldset` + `legend` *Color: Arena*) |
| `QuantityStepper` | Client | Ajusta a `[min, max]` y avisa |
| `ProductCard` | Server, con el botón de agregar como isla de cliente | Toda la tarjeta enlaza; el botón no debe anidar un `<a>` |
| `CartItem`, `FreeShippingBar`, `OrderSummary` | Client (leen Zustand) / Server en la Confirmación | `OrderSummary` solo muestra; no calcula el total real |
| `TextField` + **`Select`** (nuevo) | Client si validan en blur | Mismos props: `label`, `hint`, `error` |

Reglas:

- Las props y los nombres de las variantes son **los mismos** del diseño ([04-diseno/componentes.md](../04-diseno/componentes.md)): así otro agente puede seguir los templates sin traducir nada.
- Sin colores literales: solo `var(--token)`.
- Cada componente interactivo: foco visible (`focus-ring`), área táctil ≥ 44px en móvil, `prefers-reduced-motion`.

## 5. Verificación por componente

- [ ] Coincide visualmente con el artifact en claro **y** oscuro.
- [ ] Funciona con teclado y tiene el `aria-*` que pide el diseño.
- [ ] Los textos siguen la voz del diseño (sentence case, gerundio en `loading`).
- [ ] `npm run build` y `npm run lint` pasan.
