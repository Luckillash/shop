---
title: "Flujo de compra: recorrido y checkout en detalle"
description: "El recorrido completo Inicio → Confirmación con sus bifurcaciones (rechazo, transferencia), la acción principal de cada paso y el detalle de los 3 pasos del checkout (Contacto, Despacho, Pago)."
keywords: ["flujo de compra", "recorrido", "checkout", "pasos", "contacto", "despacho", "pago", "boleta", "factura", "medio de pago", "webpay", "flow", "transferencia", "móvil"]
related: ["04-diseno/templates.md", "04-diseno/estados-y-mensajes.md", "05-dominio/reglas-de-negocio.md", "06-implementacion/checkout-y-pedidos.md"]
source: ["_archivo/diseno-almacen.md §5.1, §5.2"]
estado: "definido"
---

# Flujo de compra

> **Úsalo cuando:** implementas la navegación entre pantallas o el checkout.

## Recorrido

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
| 1 | Inicio | *Ver novedades* | Categorías, *Ver ofertas*, tarjetas |
| 2 | Listado | Abrir el producto (toda la tarjeta) | Filtros, orden, *Cargar más productos* |
| 3 | Ficha | *Agregar al carro* | Favoritos, variantes, cantidad, opiniones |
| 4a | Carro · drawer | *Ir a pagar* | *Ver carro*, cerrar |
| 4b | Carro | *Ir a pagar* | *Seguir comprando*, *Aplicar cupón*, cantidad, eliminar |
| 5 | Checkout | *Continuar al pago* → *Pagar $TOTAL* | *Editar* en los pasos completados, *Volver al carro* |
| 5a | Pago rechazado o no completado | *Reintentar pago $TOTAL* (o *Pagar* / *Ver datos para transferir* si cambia el medio) | *Volver al carro* |
| 5b | Transferencia pendiente | — (la acción es transferir desde el banco) | *Pagar con tarjeta en su lugar*, *Ver estado del pedido* |
| 6 | Confirmación | *Seguir comprando* | *Ver estado del pedido*, *Crear cuenta* |

## Checkout en detalle

Es una página dedicada, con header y footer reducidos. El indicador de pasos muestra cada paso como listo (check `success`), actual (`aria-current="step"`, número en `brand`) o pendiente.

### 1. Contacto
- Correo: ahí se envían la boleta y el seguimiento. Se puede *Editar*.

### 2. Despacho
- Campos: Nombre, Apellido, RUT (*Lo usamos para emitir tu boleta*), Teléfono (*Solo para coordinar la entrega*), Región, Comuna, Calle y número, Depto./casa/oficina (opcional). Usan `autoComplete`; el RUT usa `inputMode="numeric"`.
- Tipo de despacho (radios con fecha y costo):
  - **Despacho a domicilio:** *Llega el martes 27 de octubre*, **Gratis** (en el ejemplo, sobre el umbral).
  - **Despacho express:** *Llega mañana, viernes 23 de octubre, si pagas antes de las 14:00*, **$4.990**.
  - **Retiro en tienda Almacén Providencia:** *Disponible desde el lunes 26 de octubre*, **Gratis**.
- *Continuar al pago* (primary lg) → *Guardando* (`loading`) → abre el paso 3. Si faltan datos: estado de errores.
- Mientras tanto, el paso 3 aparece desactivado: *Elige cómo pagar cuando completes el despacho*.

### 3. Pago
- Resumen del despacho (tipo, fecha, costo, nombre y dirección) con *Editar*.
- Medio de pago:
  - **Tarjeta de crédito o débito:** *Pagarás en Webpay Plus, de forma segura.*
  - **Otros medios con Flow:** *Pagarás en Flow con el medio que elijas allí.*
  - **Transferencia bancaria:** *Te enviamos los datos por correo y reservamos tu pedido por 48 horas.*
- Documento tributario: **Boleta** / **Factura**. La factura pide Razón social, RUT de la empresa y Giro.
- Aceptar los términos y condiciones y la política de privacidad (obligatorio).
- *Pagar $43.960* (primary lg, ícono `lock`) → *Pagando* → redirección a Webpay Plus o Flow (estado *procesando*).

### Resumen lateral (escritorio)
Productos con cantidad, subtotal, despacho, total, *¿Tienes un cupón de descuento?* (vuelve al carro) y *Pago seguro con Webpay Plus, Flow o transferencia*.

### Móvil
El resumen se pliega arriba (*Ver resumen del pedido* + total). Una barra muestra *Paso 3 de 3 · Pago*. Los pasos completados se reducen a una línea con check y *Editar*. *Pagar* ocupa todo el ancho.

## Correspondencia con el backend

| Momento del diseño | Qué pasa en el servidor |
|---|---|
| *Continuar al pago* (Guardando) | Server Action: valida los campos (RUT, teléfono, comuna) y guarda o actualiza la `address`. Calcula el despacho. **No crea el pedido todavía** |
| *Pagar $TOTAL* (Pagando) | Server Action: `syncCart` → `place_order` → inserta `payments` → `create` en la pasarela → `redirect()` a la URL de la pasarela (Webpay: formulario POST con `token_ws`; Flow: `url?token=`). Transferencia → `/pedido/[id]/transferencia` |
| *Reintentar pago* | Server Action: nuevo intento de `payments` para el **mismo** pedido (con un `buy_order` nuevo, D-013) |

Detalle en [06-implementacion/checkout-y-pedidos.md](../06-implementacion/checkout-y-pedidos.md).
