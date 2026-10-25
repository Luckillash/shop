---
title: "Lo que le toca al dueño después de la fase 6"
description: "Tareas que no puede hacer el agente tras implementar los pagos: llave de Resend, textos propuestos sin diseño, plan de Vercel para el cron, datos bancarios reales, prueba de la confirmación de Flow con un túnel o el sitio desplegado y limpieza de los datos de prueba. Cada una con los pasos y cómo comprobarla."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/pendientes-antes-de-produccion.md", "_archivo/pendientes-del-dueno-fase-5.md", "07-referencia/checklist-produccion.md", "02-arquitectura/decisiones.md", "08-estado/avance.md"]
---

# Lo que te toca a ti (fase 6)

La fase 6 (pagos) quedó implementada y probada en los ambientes de prueba: Webpay Plus (integración), Flow (sandbox) y transferencia, con cuenta y como invitado. Estas tareas dependen de ti: necesitan una cuenta en un proveedor, información que solo tú tienes o una decisión del negocio.

| # | Tarea | Prioridad | Tiempo | Bloquea |
|---|---|---|---|---|
| 1 | ~~Crear la cuenta de Resend y pasar la llave~~ ✅ Hecho en local (25-10-2026) | 🔴 Alta | — | Falta la llave de producción en Vercel |
| 2 | ~~Confirmar los textos propuestos sin diseño~~ ✅ Aprobados (25-10-2026) | 🟠 Media | — | Nada |
| 3 | ~~Elegir el plan de Vercel o cambiar a `pg_cron`~~ ✅ Vercel Pro (25-10-2026) | 🔴 Alta | — | Falta `CRON_SECRET` en Vercel al desplegar |
| 4 | ~~Pasar los datos bancarios reales~~ ✅ Hecho (25-10-2026) | 🔴 Alta | — | Falta copiarlos a Vercel al desplegar |
| 5 | Probar la confirmación de Flow con un túnel o con el sitio desplegado | 🟠 Media | 15 min | Confiar en Flow cuando el cliente cierra el navegador |
| 6 | ~~Decidir qué hacer con los datos de prueba~~ ✅ Se quedan hasta producción (25-10-2026) | 🟢 Baja | — | Borrarlos antes de publicar |

---

## 1. Crear la cuenta de Resend y pasar la llave ✅ (25-10-2026, en local)

> **Estado (25-10-2026):** ✅ Resend funcionando en local.
>
> | Qué | Cómo quedó |
> |---|---|
> | Dominio de envío | `mail.audazia.dev` (subdominio, para aislar la reputación de `audazia.dev`), región São Paulo (`sa-east-1`). **Verified** |
> | DNS (Vercel, con *Connect* de Resend) | CNAME `send.mail` → `send.forge.rmta.net` (SPF) · CNAME `rsend.mail` → `rsend-sae1.forge.rmta.net` · TXT `resend._domainkey.mail` (DKIM) |
> | DMARC (a mano en Vercel) | TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:lucassalazarc@outlook.com` (cubre todos los subdominios). Subir a `p=quarantine` cuando los reportes muestren que todo pasa |
> | Llave | `almacen-local`, *Sending access*, solo `mail.audazia.dev`. La escribió el dueño en `.env.local` (no pasó por el chat) |
> | Remitente | `EMAIL_FROM=Almacén <pedidos@mail.audazia.dev>` (no necesita buzón) |
> | Prueba | Correo directo a la API y el correo real *Datos para transferir* (plantilla + `bankDetails()` + `sendEmail`, pedido de ejemplo 9999): **llegaron, pero a spam** en Outlook. Normal en un dominio nuevo; se agregó DMARC y se marcó como *No es correo no deseado* |
>
> **Queda:** crear otra llave `almacen-produccion` y cargarla en Vercel con `EMAIL_FROM`; volver a mirar si los correos llegan a la bandeja principal (la reputación mejora con los envíos); prueba de punta a punta con un pedido real desde la tienda.

**Por qué:** elegiste Resend para los correos (D-022). El código ya envía tres correos: la confirmación del pago, los datos para transferir y el aviso de *Te devolvimos el pago*. Sin la llave **no se envía nada**: el pedido funciona igual, pero el cliente no recibe nada, y la pantalla *Transferencia pendiente* dice *También te enviamos estos datos a …*.

**Pasos:**

1. Crea una cuenta en [resend.com](https://resend.com).
2. En **Domains**, agrega el dominio de la tienda (por ejemplo `almacen.cl`) y crea en tu DNS los registros que indica (SPF y DKIM). Espera a que diga *Verified*.
3. En **API Keys**, crea una llave con permiso *Sending access*.
4. Pásale al agente la llave y el remitente que quieres (hoy `Almacén <pedidos@almacen.cl>`). Va en `.env.local` (`RESEND_API_KEY`, `EMAIL_FROM`) y, en producción, en las variables del hosting. **No la pegues en el código.**

**Mientras no tengas dominio:** Resend permite enviar desde `onboarding@resend.dev`, pero solo a tu propio correo. Sirve para que el agente pruebe los textos.

**Cómo comprobarlo:** el agente hace un pedido de prueba y verifica que llegue el correo y que en el log ya no aparezca `[email] Sin RESEND_API_KEY`.

---

## 2. Confirmar los textos propuestos sin diseño ✅ (25-10-2026)

> **Estado (25-10-2026):** ✅ aprobaste los textos tal cual (*"Estos textos están bien"*). Quedan como definitivos; B14 y B37 cerradas.

**Por qué:** el diseño no tiene texto para estos casos. El agente los propuso con la voz de la tienda (brechas B14 y B37) y ya se muestran:

| Caso | Título | Texto |
|---|---|---|
| Cancelaste el pago en Webpay | *Tu pago no se completó* | *Cancelaste el pago en Webpay Plus. No hicimos ningún cargo.* |
| Se acabó el tiempo del formulario de Webpay | *Tu pago no se completó* | *Se acabó el tiempo para pagar en Webpay Plus. No hicimos ningún cargo.* |
| La pasarela no responde | *Tu pago no se completó* | *No pudimos conectar con Webpay Plus. Intenta de nuevo en unos minutos o elige otro medio de pago.* |
| Volviste de Flow y el pago sigue pendiente | *Estamos confirmando tu pago* | *Esto puede tardar unos segundos. No hace falta que pagues de nuevo.* + *¿No terminaste de pagar?* |
| El pedido venció | *Este pedido venció* | *Pasó el plazo para pagarlo y liberamos los productos. No hicimos ningún cargo.* |
| Pagaste después de que venció | *Te devolvimos el pago* | *Recibimos tu pago después de que venció el plazo del pedido, y ya habíamos liberado los productos. Te devolvimos el monto completo: según tu banco, puede tardar unos días hábiles en verse en tu cuenta.* |
| Enlace de pago desconocido | *No encontramos ese pago* | *Puede que el enlace haya vencido. Si te hicieron un cargo, escríbenos a hola@almacen.cl con el número de pedido y lo revisamos.* |

Además, la Confirmación dice *Te enviamos el detalle a …* en vez de *Te enviamos la boleta y el detalle a …*, porque todavía no se emite boleta (D-012).

**Resultado:** aprobados sin cambios. Si más adelante quieres ajustar alguno, están en `rejectionCopy` (`src/lib/payments/labels.ts`) y en las pantallas de `/pedido/[id]`.

---

## 3. Elegir el plan de Vercel o cambiar a `pg_cron` ✅ (25-10-2026)

> **Decisión (25-10-2026):** opción **a)**. Pasaste tu cuenta de Vercel a **Pro**, así que el cron cada 10 minutos de `vercel.json` funciona tal cual; no hace falta `pg_cron`.
>
> **Queda al desplegar** (el proyecto aún no está creado ni vinculado en Vercel): cargar `CRON_SECRET` en *Settings → Environment Variables* (Production) con un valor **distinto** al de `.env.local`. **Pendiente para producción:** el agente lo genera en ese momento (`crypto.randomBytes(32)`), sin mostrarlo en el chat. Después del primer despliegue, comprobar en *Settings → Cron Jobs* que aparece `/api/cron/expirar-pedidos` y que las ejecuciones responden 200 (no 401).

**Por qué:** elegiste Vercel Cron cada 10 minutos (D-021) y `vercel.json` ya lo programa. Pero **el plan Hobby (gratis) de Vercel solo permite crons diarios.** Con un cron diario, un pedido abandonado retiene el stock hasta 24 horas, no 30 minutos.

**Opciones:**

| Opción | Efecto |
|---|---|
| a) Plan Pro de Vercel | El cron cada 10 min funciona tal cual |
| b) `pg_cron` + `pg_net` en Supabase (recomendada si te quedas en Hobby) | Supabase llama a `/api/cron/expirar-pedidos` con el secreto cada 10 min. El agente lo configura |
| c) Un cron externo (cron-job.org, GitHub Actions) | Igual que b), pero fuera de Supabase |

**En cualquier caso:** carga `CRON_SECRET` en las variables del proyecto de producción (un string aleatorio largo; el agente puede generarlo). Sin él, el cron responde 401.

**Resultado:** opción a), Vercel Pro.

---

## 4. Pasar los datos bancarios reales ✅ (25-10-2026)

> **Estado (25-10-2026):** ✅ los pasaste y quedaron en `.env.local`. La pantalla *Transferencia pendiente* y el correo ya usan los datos reales (reemplazaron a los de ejemplo del diseño):
>
> | Dato | Variable | Valor real | Antes (ficticio) |
> |---|---|---|---|
> | Banco | `BANK_NAME` | Itaú | Banco de Chile |
> | Tipo de cuenta | `BANK_ACCOUNT_TYPE` | Cuenta corriente | Cuenta corriente |
> | Número | `BANK_ACCOUNT_NUMBER` | 0232155780 | 00-123-45678-09 |
> | Titular | `BANK_ACCOUNT_HOLDER` | Lucas Ignacio Salazar Cartes | Almacén SpA |
> | RUT | `BANK_ACCOUNT_RUT` | 20.630.500-2 (dígito verificador válido) | 76.543.210-3 |
> | Correo para el comprobante | `BANK_ACCOUNT_EMAIL` | lucassalazarc@outlook.com | pagos@almacen.cl |

**Qué queda:** al desplegar, cargar las mismas seis variables en Vercel (Project Settings → Environment Variables). `.env.example` conserva los valores de ejemplo, porque es una plantilla. Si los datos cambian, basta con cambiar las variables y reiniciar el servidor (las variables se leen al arrancar).

**Recuerda:** quien confirma que llegó una transferencia eres tú (todavía no hay administración, fase 7). Mientras tanto, pídele al agente que la marque como pagada indicándole el número de pedido y el monto recibido.

---

## 5. Probar la confirmación de Flow con un túnel o con el sitio desplegado 🟠

**Por qué:** cuando alguien paga en Flow, Flow avisa a la tienda por dos caminos: el navegador del cliente (`urlReturn`) y un aviso directo de su servidor (`urlConfirmation`). El segundo cubre al cliente que cierra el navegador después de pagar. **Ese aviso no puede llegar a `localhost`**, así que en esta fase se probó simulándolo (decisión D-024). Sin él, el pago igual se registra cuando el cliente vuelve, o cuando el cron revisa el pedido antes de anularlo.

**Opciones:**

- **Con el sitio desplegado** (lo más simple): cuando haya una URL pública, el agente hace una compra en sandbox y revisa que llegue el aviso.
- **Con un túnel en tu equipo:** instala cloudflared (`winget install Cloudflare.cloudflared`) o ngrok (necesita cuenta) y avísale al agente; él levanta el túnel y prueba.

---

## 6. Decidir qué hacer con los datos de prueba ✅ (25-10-2026)

> **Decisión (25-10-2026):** se **dejan** los datos de prueba (sirven para probar Mis pedidos y la administración en la fase 7) y se **borran al subir a producción**. Está en el checklist de producción.

Durante las pruebas quedaron en Supabase los pedidos **1007 a 1035** (el próximo pedido será el N.º 1036):

| Pedidos | Estado |
|---|---|
| 1020, 1021, 1022, 1027, 1028, 1029 | **Pagados** en los ambientes de prueba (no hubo dinero real). Descuentan stock: 4 frascos de 1 L y 3 sets de paños |
| 1030 | Anulado, con el pago reembolsado en Flow y una alerta `paid_after_cancel` (era la prueba del pago tardío) |
| El resto | Anulados por el cron, con el stock devuelto |

También quedan el usuario `prueba.fase5@almacen.cl` y varios usuarios anónimos de las pruebas.

**Cómo se borrarán al subir a producción** (lo hace el agente con el MCP de Supabase):

1. Anular con `cancel_order` los que sigan pagados (1020, 1021, 1022, 1027, 1028, 1029, y los que se agreguen en la fase 7) para **devolver el stock** (4 frascos de 1 L y 3 sets de paños). Son pagos de prueba: no hay que reembolsar nada.
2. Borrar los pedidos de prueba (1001–1035 y los que se creen después) de `orders`. Se borran en cascada `order_items`, `payments`, `payment_alerts` y `coupon_redemptions`; los `inventory_movements` quedan con `order_id` nulo.
3. Borrar los usuarios de prueba en *Authentication → Users*: `prueba.fase5@almacen.cl` y los anónimos.
4. Comprobar que el stock cuadra con el catálogo real y que los cupones quedan con `used_count` correcto.

---

## Cuando termines

Avísale al agente qué hiciste (por ejemplo: *"Esta es la llave de Resend; los textos están bien; voy con pg_cron; estos son los datos del banco"*). El agente:

1. Configura las variables y prueba un pedido con correo real.
2. Aplica los cambios de textos que pidas.
3. Programa el cron según la opción elegida.
4. Actualiza [08-estado/avance.md](../08-estado/avance.md), el [registro de cambios](../08-estado/registro-de-cambios.md), el [checklist de producción](../07-referencia/checklist-produccion.md) y [pendientes antes de producción](pendientes-antes-de-produccion.md).

Después sigue la **fase 7: postcompra y operación** (Mis pedidos, invitado → cuenta, administración mínima para confirmar transferencias y revisar las alertas de pago).
