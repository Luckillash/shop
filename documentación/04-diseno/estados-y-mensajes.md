---
title: "Estados de espera, error y pago, y mensajes definidos"
description: "Patrones de espera (loading, role=status), errores de formulario, pago rechazado, Flow no completado y transferencia pendiente, con todos los textos exactos definidos por el diseño."
keywords: ["estados", "loading", "gerundio", "errores de formulario", "mensajes de error", "pago rechazado", "pago no completado", "transferencia pendiente", "notice", "role alert", "role status", "copiar", "microcopy"]
related: ["04-diseno/principios-voz-y-accesibilidad.md", "04-diseno/componentes.md", "05-dominio/ciclo-de-vida-del-pedido.md", "05-dominio/formatos-chile.md"]
source: ["_archivo/diseno-almacen.md §2.3, §4.4, §5.4"]
estado: "definido"
---

# Estados y mensajes

> **Úsalo cuando:** implementas un estado de espera, una validación o una pantalla de resultado del pago. **Copia los textos tal cual.**

## Espera

- El `Button` primario pasa a `loading`, con el verbo en gerundio. Conserva su tamaño y no acepta otro clic.
- Los campos del paso quedan deshabilitados.
- Una línea `role="status"` dice qué pasa y qué no hacer.

| Botón (reposo → espera) | Dónde |
|---|---|
| *Agregar al carro* → *Agregando* | Ficha |
| *Aplicar cupón* → *Aplicando* | Carro |
| *Continuar al pago* → *Guardando* | Checkout, despacho |
| *Pagar $43.960* → *Pagando* | Checkout, pago |
| *Ingresar* → *Ingresando* | Ingresar |
| *Suscribirme* → *Suscribiendo* | Footer |

Línea de estado al pagar: *Te estamos llevando a Webpay Plus para pagar $43.960. No cierres ni actualices esta página.* (o *…a Flow…*). Mientras tanto, *Volver al carro* queda sin enlace.

En React 19: usa `useFormStatus` (o `useActionState`) con la Server Action para obtener `pending` y pasarlo a `loading`.

## Errores de formulario

- Al presionar la acción con datos incompletos: un `Notice danger` arriba del paso, con el conteo y enlaces a cada campo. El **botón sigue activo**.
- Cada `TextField` muestra un error que dice **la solución, no el diagnóstico**. Aparece al salir del campo y al enviar.

| Campo o caso | Mensaje |
|---|---|
| Resumen (despacho) | *Revisa N datos para continuar* |
| Resumen (pago) | *Revisa N datos para pagar* |
| Nombre vacío | *Escribe tu nombre.* |
| RUT (persona o empresa) | *Revisa el dígito verificador: es el número o la K después del guion.* |
| Teléfono incompleto | *Faltan dígitos. Escribe los 9 números de tu celular, por ejemplo +56 9 1234 5678.* |
| Comuna sin elegir | *Elige la comuna para calcular la fecha de entrega.* |
| Calle sin número | *Agrega el número de la calle, por ejemplo Av. Providencia 1234.* |
| Razón social vacía | *Escribe la razón social de la empresa, tal como aparece en el SII.* |
| Términos sin aceptar | *Acepta los términos para poder pagar.* |
| Despacho a domicilio sin comuna | *Elige tu comuna para ver la fecha de entrega* |

Los mensajes que **no** están definidos (apellido, región, correo, giro, contraseña) siguen el mismo patrón: verbo en imperativo + cómo resolverlo. Por ejemplo: *Escribe tu correo, por ejemplo nombre@correo.cl.*

## Pago rechazado (Webpay Plus)

Template `PagoRechazado`. Bloque `role="alert"` con ícono `alert` en `danger-soft`.

- Encabezado: *Pedido N.º 10482 · Webpay Plus* — **Tu pago fue rechazado**
- Causa: *El banco no autorizó la compra en Webpay Plus. No hicimos ningún cargo a tu tarjeta.*
- `Notice info`: *Tu pedido sigue guardado*
- *Qué puedes hacer:* 1) Prueba con otra tarjeta · 2) Revisa con tu banco · 3) Paga por transferencia
- *Elige cómo pagar*, con el medio anterior preseleccionado
- *Reintentar pago $43.960* (primary) + *Volver al carro* (ghost)
- Contacto si ves un cargo: *hola@almacen.cl*
- Resumen con *Total por pagar*

## Pago no completado (Flow)

Es el mismo template con `caso="flow"`.

- **Tu pago en Flow no se completó**
- Causa: *El pago se canceló o se acabó el tiempo para completarlo en Flow. No hicimos ningún cargo.*
- Caminos: 1) Vuelve a intentarlo en Flow · 2) Paga con tarjeta en Webpay Plus · 3) Paga por transferencia

## Transferencia pendiente

Template `TransferenciaPendiente`.

- `Badge warning` *Pago pendiente* + *Pedido N.º 10482*
- *Transfiere $43.960 para confirmar tu pedido*
- Reserva: *hasta el sábado 24 de octubre a las 22:00* (también se envía por correo)
- *Datos para transferir*: cada fila tiene *Copiar*, y hay un *Copiar todos los datos*. Al copiar, el botón cambia a *Copiado* y se anuncia con `role="status"`
- `Notice warning`: transferir el monto exacto, con el mensaje *Pedido 10482*; si no llega a tiempo, el pedido se anula sin costo
- *Qué viene ahora:* transferir → confirmamos en menos de un día hábil → despachamos
- *Pagar con tarjeta en su lugar* (secondary) + *Ver estado del pedido* (ghost)
- Resumen con *Total a transferir*

Datos bancarios del diseño (**hay que confirmarlos antes de producción**): Banco de Chile · Cuenta corriente 00-123-45678-09 · Almacén SpA · RUT 76.543.210-3 · pagos@almacen.cl.

## Mapeo resultado → pantalla

| Resultado técnico | Pantalla |
|---|---|
| Webpay `commit`: `response_code == 0` y `status == "AUTHORIZED"` | Confirmación |
| Webpay `commit`: cualquier otro resultado | Pago rechazado (Webpay) |
| Webpay: vuelve con `TBK_TOKEN` (abortado) o solo con `TBK_ORDEN_COMPRA` (timeout) | Pago rechazado. **Sin commit.** ✅ Textos propuestos y aprobados por el dueño (B14): título *Tu pago no se completó*; *Cancelaste el pago en Webpay Plus. No hicimos ningún cargo.* / *Se acabó el tiempo para pagar en Webpay Plus. No hicimos ningún cargo.* |
| Flow `status = 2` | Confirmación |
| Flow `status = 3` o `4` | Pago no completado (Flow) |
| Flow `status = 1` | ✅ `/pedido/<id>`: *Estamos confirmando tu pago* · *Esto puede tardar unos segundos. No hace falta que pagues de nuevo.* Consulta `getStatus` cada 3 s (hasta 10 veces) y ofrece *¿No terminaste de pagar?* + *Elige cómo pagar* (propuesta aprobada, B37) |
| Transferencia elegida | Transferencia pendiente |
| Error técnico (la pasarela no responde) | ✅ El pedido ya existe, así que va a Pago rechazado con la causa *No pudimos conectar con Webpay Plus. Intenta de nuevo en unos minutos o elige otro medio de pago.* (o *…con Flow…*). En *Elige cómo pagar*, el mismo texto en un `Notice danger` |
| Pedido anulado por vencimiento | ✅ `/pedido/<id>`: *Este pedido venció* · *Pasó el plazo para pagarlo y liberamos los productos. No hicimos ningún cargo.* + *Volver al carro* (propuesta aprobada, B37) |
| Pago aprobado sobre un pedido anulado (B13) | ✅ `/pedido/<id>`: *Te devolvimos el pago* (propuesta aprobada, B37) y correo |
