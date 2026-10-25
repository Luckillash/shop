---
title: "Formatos y validaciones de Chile: CLP, RUT, teléfono, direcciones y fechas"
description: "Implementación de referencia de formatCLP, la validación del RUT (módulo 11), el formato del teléfono móvil, regiones y comunas, y el formato de fechas de entrega y de límite en America/Santiago."
keywords: ["CLP", "formatCLP", "pesos", "RUT", "dígito verificador", "módulo 11", "teléfono", "+56 9", "celular", "región", "comuna", "fechas", "America/Santiago", "Intl", "días hábiles"]
related: ["04-diseno/estados-y-mensajes.md", "01-fundamentos/convenciones-de-codigo.md", "05-dominio/reglas-de-negocio.md"]
source: ["_archivo/diseno-almacen.md §2.2, §5.2, §5.4"]
estado: "vigente (implementado en src/lib/format/; faltan regiones, comunas y feriados)"
---

# Formatos y validaciones de Chile

> **Úsalo cuando:** muestras montos o fechas, o validas RUT, teléfono o dirección. Estas funciones están en `src/lib/format/` y sirven para el cliente y el servidor.

✅ **Implementado en la fase 0.** Los casos de prueba de este documento están en `src/lib/format/*.test.ts` (Vitest, `npm run test:run`):

| Archivo | Exporta |
|---|---|
| `src/lib/format/clp.ts` | `formatCLP(amount)` |
| `src/lib/format/rut.ts` | `cleanRut`, `isValidRut`, `normalizeRut` (`"12345678-5"`, para guardar), `formatRut` (`"12.345.678-5"`, para mostrar) |
| `src/lib/format/phone.ts` | `isValidChileanMobile`, `normalizeChileanMobile` (`"+56912345678"` o `null`), `formatChileanMobile` (`"+56 9 1234 5678"`) |
| `src/lib/format/dates.ts` | `BUSINESS_TIME_ZONE`, `formatDeliveryDay` (sin coma), `formatTime`, `formatDeadline` |

Todavía faltan las listas de regiones, comunas y feriados (ver más abajo). Los bloques de código siguientes son la referencia que se usó para implementar estas funciones.

## Montos (CLP)

Formato: `$12.490`. Punto de miles, sin decimales y sin espacio después del signo.

```ts
// src/lib/format/clp.ts
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number): string {
  return clp.format(Math.round(amount)); // "$12.490"
}
```

> Comprueba la salida en Node y en el navegador: según la versión de ICU, algunos entornos insertan un espacio no separable. Si pasa, quítalo con `.replace(/\s/g, "")`. Prueba: `formatCLP(43960) === "$43.960"`.

Los decimales (que no son dinero) usan coma: *4,6 estrellas* → `value.toLocaleString("es-CL", { maximumFractionDigits: 1 })`.

## RUT

- Formato de entrada flexible: `12.345.678-5`, `12345678-5`, `123456785`. La `k` se acepta en minúscula o mayúscula.
- Se guarda normalizado sin puntos y con guion: `12345678-5`. Se muestra con puntos: `12.345.678-5`.
- Validación por **módulo 11**:

```ts
// src/lib/format/rut.ts
export function cleanRut(input: string): string {
  return input.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function isValidRut(input: string): boolean {
  const rut = cleanRut(input);
  if (rut.length < 2) return false;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return dv === expected;
}

export function formatRut(input: string): string {
  const rut = cleanRut(input);
  const body = rut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${rut.slice(-1)}`;
}
```

Casos de prueba: `11.111.111-1` ✓ (RUT de prueba de Webpay y Flow) · `76.543.210-3` ✓ (RUT del diseño) · `11.111.111-2` ✗.

Error: *Revisa el dígito verificador: es el número o la K después del guion.*

## Teléfono

- Celular chileno: **9 dígitos**, empieza con 9. Formato de entrada y visualización: `+56 9 1234 5678`.
- Normalización: quita todo lo que no sea dígito y el prefijo `56` si viene. Válido si queda `/^9\d{8}$/`. Se guarda en formato E.164: `+56912345678`.
- `TextField` con `inputMode="numeric"` (o `tel`) y `autoComplete="tel"`.
- Error: *Faltan dígitos. Escribe los 9 números de tu celular, por ejemplo +56 9 1234 5678.*

## Dirección

| Campo | Columna | `autoComplete` | Validación |
|---|---|---|---|
| Región | `addresses.region` | `address-level1` | Una de las 16 regiones (select) |
| Comuna | `addresses.city` | `address-level2` | Una comuna de la región elegida (select dependiente) |
| Calle y número | `line1` | `address-line1` | Debe contener un número: `/\d/` |
| Depto./casa/oficina | `line2` | `address-line2` | Opcional |

- ✅ Lista de regiones y comunas en `src/lib/chile/regions.ts` (B31): 16 regiones y 346 comunas con los nombres de la SUBDERE sin "Región de" (`addresses.region` = `Metropolitana de Santiago`, que es lo que compara `place_order`). `isCommuneOf(región, comuna)` valida el select dependiente.
- "Chile continental": el diseño no despacha a Isla de Pascua ni a Juan Fernández. Exclúyelos de la lista o muestra que no hay despacho.

## Fechas

Zona: **`America/Santiago`**. Idioma: `es-CL`.

```ts
// src/lib/format/dates.ts
const day = new Intl.DateTimeFormat("es-CL", {
  weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago",
});
const time = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago",
});

export const formatDeliveryDay = (d: Date) => day.format(d);              // "jueves, 24 de octubre"
export const formatDeadline = (d: Date) => `${day.format(d)} a las ${time.format(d)}`;
```

- El diseño escribe sin coma: *el jueves 24 de octubre*. `Intl` devuelve `"jueves, 24 de octubre"`: quita la coma (`.replace(",", "")`).
- Entrega: *Llega el jueves 24 de octubre* · *Llega mañana, viernes 23 de octubre, si pagas antes de las 14:00* · *Disponible desde el lunes 26 de octubre*.
- Límite de la transferencia: *hasta el sábado 24 de octubre a las 22:00*.
- Días hábiles: de lunes a viernes, sin feriados. ✅ `src/lib/chile/business-days.ts`: feriados 2026–2027 (verificados el 24-10-2026; hay que agregar cada año) y `addBusinessDays` sobre fechas de calendario de Santiago.
- Cuidado con el cambio de horario de Chile (abril y septiembre): calcula siempre con `timeZone`, nunca sumando horas a mano a un offset fijo.
