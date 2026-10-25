---
title: "Diseño Almacén: principios, voz y contenido, accesibilidad"
description: "Los 4 principios del diseño, cómo escribir los textos de la interfaz (tú, español de Chile, sentence case, sin exclamaciones, fechas concretas, cifras) y las reglas de accesibilidad."
keywords: ["principios", "voz", "tono", "microcopy", "textos", "sentence case", "tú", "español de chile", "accesibilidad", "a11y", "aria", "focus", "role alert", "role status", "WCAG"]
related: ["04-diseno/estados-y-mensajes.md", "04-diseno/componentes.md", "05-dominio/formatos-chile.md"]
source: ["_archivo/diseno-almacen.md §1, §2.1, §2.2, §2.9"]
estado: "definido"
---

# Principios, voz y accesibilidad

> **Úsalo cuando:** escribes cualquier texto visible, decides la jerarquía de una vista o revisas la accesibilidad.

## Artifacts de diseño (fuente)

| Artifact | Contenido | Enlace |
|---|---|---|
| Design system **Almacén** | Tokens (claro y oscuro), manual de marca, patrones de pago, 15 componentes React | https://claude.ai/artifact/8ueRvwVuopKWk3enu498tj |
| **Almacén · Templates de la tienda** | 40 pantallas (escritorio y móvil) | https://claude.ai/artifact/E7sfHjPteptX18QCaikCri |
| **Almacén — Flujo de compra** | Canvas de 6 pasos. **Incompleto:** solo tiene 4 de sus 15 pantallas. Usa el de Templates | https://claude.ai/artifact/9otwRsPJLSkA4HHCvjDKCV |

Para leerlos, usa la herramienta Artifact (`action: "read"`). No uses WebFetch.

## Principios

1. **El precio nunca se esconde.** El precio, el descuento y el costo de despacho se ven antes de agregar al carro. Nada de *Consultar precio* ni costos que aparecen en el último paso.
2. **Una acción principal por vista.** Un solo botón `primary` (verde `brand`); todo lo demás es `secondary` o `ghost`.
3. **El producto es el color.** La interfaz es papel (`surface`) y tinta (`ink`); el color lo ponen las fotos. El verde y el tomate se usan con intención, no para decorar.
4. **Confianza en cada paso.** Fechas de entrega concretas, errores que dicen cómo resolverse, y estados que se leen con una palabra y un ícono, no solo con color.

## Voz y contenido

- Se trata al cliente de **tú**, en español de Chile claro: *carro* (no carrito), *despacho*, *boleta*, *comuna*, *RUT*.
- **Sentence case** siempre (*Agregar al carro*). Las mayúsculas se usan solo en `overline` (marca) y en los códigos de cupón.
- **Sin signos de exclamación ni emoji.**
- Botones con **verbo + objeto**: *Agregar al carro*, *Ir a pagar*, *Aplicar cupón*, *Ver carro*.
- Durante la espera, el verbo pasa a gerundio: *Agregando*, *Pagando*, *Guardando*, *Aplicando*, *Ingresando*, *Suscribiendo*.
- **Fechas, no plazos vagos:** *Llega el jueves 24 de octubre*. Si no hay fecha exacta: *Despacho a regiones en 3 a 5 días hábiles*.
- **Errores que ayudan:** qué pasó y qué hacer. *El banco no autorizó la compra. Prueba con otra tarjeta o paga por transferencia.*
- **Siempre se dice dónde se terminará de pagar:** *Pagarás en Webpay Plus*.
- **Cifras:** `$12.490` (punto de miles, sin decimales, sin espacio después del signo). Los decimales usan coma: *4,6 estrellas*. Usa `formatCLP`.

| En vez de | Escribe |
|---|---|
| ¡Cómpralo ya! | Agregar al carro |
| Error 402 | Tu pago fue rechazado |
| Envío gratis (aplican condiciones) | Despacho gratis sobre $39.990 |
| Stock limitado | Quedan 2 unidades de este color |
| RUT inválido | Revisa el dígito verificador |
| Carrito | Carro |

> Los mensajes de `place_order` en la base de datos dicen *carrito* (*El carrito está vacío*). Tradúcelos al tono del diseño antes de mostrarlos.

## Accesibilidad

- Toda acción se puede hacer con teclado y muestra `focus-ring` (2px del color de la página + 2px de `brand`).
- El contraste texto/fondo cumple WCAG AA (4.5:1) en ambos temas. Los bordes de controles, los íconos y el foco tienen al menos 3:1.
- Los lectores de pantalla deben oír los precios y valoraciones completos: *Precio oferta $19.990, precio normal $27.990*; *4,6 de 5 estrellas, 128 opiniones*.
- Campos con error: `aria-invalid="true"` + `aria-describedby` apuntando al mensaje.
- `role="alert"`: el rechazo de un pago y `Notice danger`. `role="status"`: la espera, *Copiado* y los demás `Notice`.
- Checkout: el paso actual lleva `aria-current="step"`. Mientras se procesa el pago, `aria-busy` y los fieldsets deshabilitados.
- Los estados (`success`, `warning`, `danger`) siempre van con un ícono o una palabra, nunca solo con color.
- Se respeta `prefers-reduced-motion`.
- Área táctil mínima de 44px en móvil (`touch-target`).
- `<html lang="es-CL">` (ya aplicado en `layout.tsx`).
