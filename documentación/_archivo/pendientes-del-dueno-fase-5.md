---
title: "Lo que le toca al dueño después de la fase 5"
description: "Tareas que no puede hacer el agente: configuración de Supabase Auth, datos de la tienda por confirmar, decisiones abiertas y limpieza de los datos de prueba. Cada una con los pasos y cómo comprobarla."
generated: "2026-10-24"
estado: "vigente"
---

# Lo que te toca a ti (fase 5)

La fase 5 (cuenta y checkout) quedó implementada y probada con una cuenta. Estas tareas dependen de ti: necesitan acceso al panel de Supabase, información que solo tú tienes o una decisión del negocio.

| # | Tarea | Prioridad | Tiempo | Bloquea |
|---|---|---|---|---|
| 1 | ✅ Activar los inicios de sesión anónimos (24-10-2026) | Hecha | — | — |
| 2 | ✅ Agregar `/auth/confirm` a las Redirect URLs (24-10-2026) | Hecha | — | Falta probarlo con un correo real |
| 3 | Confirmar la dirección del retiro en tienda (hoy con datos **ficticios**) | 🟠 Media | Avisar | Publicar el retiro en tienda |
| 4 | ✅ Express solo para la RM (24-10-2026) | Hecha | — | — |
| 5 | ✅ Verificar los feriados 2026–2027 (24-10-2026) | Hecha | — | — |
| 6 | Datos de prueba: ✅ pedidos anulados (24-10-2026); falta borrar los usuarios antes de producción | 🟢 Baja | 2 min | Nada |
| 7 | ✅ Historial de migraciones (24-10-2026) | Hecha | — | — |

---

## 1. Activar los inicios de sesión anónimos ✅ Hecha (24-10-2026)

> Verificado por el agente: pedido 1004 como invitado (Viña del Mar, Flow, boleta, $27.470). El usuario anónimo quedó con su perfil y su dirección, y el correo de contacto quedó en el pedido.

**Por qué:** la compra como invitado (decisión D-008) crea una sesión anónima de Supabase, porque la función que crea los pedidos (`place_order`) exige un usuario. Hoy está **desactivado**: si alguien presiona *Continuar como invitado*, la tienda muestra *La compra como invitado no está disponible en este momento. Ingresa o crea una cuenta.*

**Pasos:**

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) y abre el proyecto `nswchmyzgcutyehhuche`.
2. Ve a **Authentication → Sign In / Providers** (en algunas versiones: *Authentication → Providers*).
3. Activa **Allow anonymous sign-ins**.
4. Guarda.

**Recomendado:** en la misma sección, activa un captcha (Cloudflare Turnstile o hCaptcha) para los inicios anónimos. La tienda ya limita a 10 sesiones por hora por IP con Redis, pero el captcha protege también cuando Redis no está disponible.

**Cómo comprobarlo:** avísale al agente. Puede revisarlo solo (consulta `GET /auth/v1/settings`: `"anonymous_users": true`) y hacer un pedido de punta a punta como invitado.

---

## 2. Agregar `/auth/confirm` a las Redirect URLs ✅ Hecha (24-10-2026)

> Falta una prueba real: crea una cuenta con tu correo en `/ingresar` y abre el enlace que llega. Debes volver a la tienda con la sesión iniciada.

**Por qué:** la confirmación de correo está **activada** en el proyecto. Al crear una cuenta, Supabase envía un enlace que vuelve a la tienda en `/auth/confirm`. Si esa dirección no está permitida, Supabase redirige a otra parte y la cuenta no se confirma.

**Pasos:**

1. En Supabase: **Authentication → URL Configuration**.
2. En **Redirect URLs**, agrega:
   - `http://localhost:3000/auth/confirm` (desarrollo)
   - `http://localhost:3000/**` si prefieres permitir cualquier ruta local
   - Cuando tengas el dominio: `https://<tu-dominio>/auth/confirm`
3. Revisa que **Site URL** sea la dirección principal de la tienda (en producción, el dominio real).

**Opcional (recomendado para SSR):** en **Authentication → Email Templates → Confirm signup**, cambia el enlace por:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

La tienda acepta las dos formas (la plantilla por defecto y esta), pero esta funciona aunque el enlace se abra en otro navegador.

**Otra opción:** si no quieres pedir confirmación de correo, desactívala en **Authentication → Sign In / Providers → Email → Confirm email**. Así, al crear la cuenta se entra de inmediato.

**Cómo comprobarlo:** crea una cuenta con tu correo en `/ingresar`, abre el enlace del correo y verifica que vuelvas a la tienda con la sesión iniciada.

---

## 3. Confirmar la dirección del retiro en tienda 🟠 (datos ficticios por ahora)

> **Estado (24-10-2026):** a pedido tuyo, el agente cargó datos **inventados** para no bloquear el desarrollo:
>
> | Dato | Valor ficticio |
> |---|---|
> | Tienda | Almacén Providencia |
> | Dirección | Av. Manuel Montt 1530, Local 4, Providencia, Región Metropolitana |
> | Listo para retirar | Desde el día hábil siguiente al pago |
> | Horario | Lunes a viernes de 10:00 a 19:00 y sábados de 10:00 a 14:00 |
> | Indicaciones | *Retira con tu RUT y el número de pedido.* |
>
> **Antes de publicar la tienda** hay que reemplazarlos por los reales. Basta con mandarle al agente los datos de abajo.

**Por qué:** el checkout ofrece *Retiro en tienda Almacén Providencia* (gratis). Hoy usa una dirección **provisoria**: *Av. Providencia 1234, Providencia*. Aparece en el checkout y queda guardada en cada pedido con retiro.

**Qué necesito de ti:**

- Nombre de la tienda, calle y número, local u oficina (si tiene), comuna y región.
- Desde cuántos días hábiles después del pago se puede retirar.
- Horario de retiro.
- Indicaciones para retirar (qué tiene que llevar el cliente).

**Qué hará el agente:** cambiarla en los dos lugares donde está (`src/lib/store.ts` y la función `place_order` de la base de datos).

---

## 4. Decidir si el express es solo para la Región Metropolitana ✅ Hecha (24-10-2026)

> **Decisión:** opción a), solo en la RM. Detalles que propuso el agente (avisa si quieres cambiarlos): todas las comunas de la RM, incluidas las rurales; $4.990; nunca gratis; llega al día hábil siguiente si se paga antes de las 14:00 de un día hábil. Fuera de la RM la opción aparece deshabilitada con *Solo en la Región Metropolitana*.

**Por qué:** el diseño dice *Llega mañana si pagas antes de las 14:00*, pero no aclara si eso vale para todo Chile. Hoy el express ($4.990) se ofrece **en todas las regiones**, y un despacho al día siguiente a Punta Arenas no es realista con Starken.

**Opciones:**

| Opción | Efecto |
|---|---|
| a) Solo en la RM (recomendada) | Fuera de la RM, el express aparece deshabilitado o no aparece |
| b) Todo Chile, con plazo por zona | El express cuesta lo mismo, pero en regiones llega en más días |
| c) Dejarlo como está | Todo Chile, al día hábil siguiente |

**Qué necesito de ti:** la opción elegida. Ya está decidido que el express nunca es gratis, aunque la compra pase de $39.990.

---

## 5. Verificar los feriados 2026–2027 ✅ Hecha (24-10-2026)

> **Resultado de la verificación del agente:** 2026 estaba correcto (16 feriados). En 2027 **faltaba el viernes 17 de septiembre**: la Ley 20.983 lo declara feriado cuando el 18 y el 19 caen sábado y domingo, y en 2027 se cumple. Ya está agregado (2027 queda con 17 feriados). Fuentes: Chilevisión, 24horas.cl, Buk y el texto de la Ley 20.983. No se incluyeron los feriados regionales (7 de junio en Arica y Parinacota, 20 de agosto en Chillán y Chillán Viejo).

**Por qué:** las fechas de entrega (*Llega el martes 27 de octubre*) cuentan días hábiles, sin fines de semana ni feriados. El agente cargó la lista de memoria y hay que contrastarla con el calendario oficial, sobre todo los feriados que se trasladan a lunes y los "interferiados".

**Pasos:** compara la lista con [feriados.cl](https://www.feriados.cl) o con el calendario del Gobierno, y avisa si falta o sobra alguna fecha.

| 2026 | 2027 |
|---|---|
| 1 ene · 3 abr · 4 abr · 1 may · 21 may · 21 jun · 29 jun · 16 jul · 15 ago · 18 sep · 19 sep · 12 oct · 31 oct · 1 nov · 8 dic · 25 dic | 1 ene · 26 mar · 27 mar · 1 may · 21 may · 21 jun · 28 jun · 16 jul · 15 ago · **17 sep** · 18 sep · 19 sep · 11 oct · 31 oct · 1 nov · 8 dic · 25 dic |

**A futuro:** la lista hay que actualizarla cada año (archivo `src/lib/chile/business-days.ts`).

---

## 6. Decidir qué hacer con los datos de prueba 🟢 (pedidos anulados)

> **Hecho (24-10-2026):** los pedidos 1001 a 1004 se anularon con `cancel_order`. Están en estado `cancelled` (se conservan como historial), el stock volvió a los valores del seed y el cupón BIENVENIDA10 quedó libre. **Falta:** borrar el usuario `prueba.fase5@almacen.cl` y los usuarios anónimos de las pruebas desde *Authentication → Users* antes de pasar a producción (o pedírselo al agente). El próximo pedido será el N.º 1007.

Durante las pruebas quedaron en Supabase:

| Dato | Detalle |
|---|---|
| Usuario | `prueba.fase5@almacen.cl` (contraseña `Prueba-fase5-2026`), con una dirección guardada |
| Pedido 1001 | Pendiente, Webpay, $47.664: 2 tazas Arena, 1 frasco de 1 L, 1 florero |
| Pedidos 1002 y 1003 | Pendientes, transferencia con factura, $20.480 c/u: 1 taza Arena y 1 frasco de 1 L cada uno |
| Pedido 1004 | Pendiente, invitado (usuario anónimo), Flow, $27.470: 1 taza Arena y 1 frasco de 1 L |

Esos pedidos **reservan stock** (5 tazas Arena, 4 frascos de 1 L y 1 florero) hasta que el cron de vencimiento de la fase 6 los anule. Además, el cupón BIENVENIDA10 (un uso por persona) ya figura usado por el usuario de prueba.

**Opciones:**

- **Anularlos ahora** con `cancel_order`: devuelve el stock y libera el cupón. El agente puede hacerlo si se lo pides.
- **Dejarlos** para probar el cron y los pagos en la fase 6.
- **Borrar también el usuario** de prueba (desde *Authentication → Users*) cuando ya no se necesite. Antes de pasar a producción hay que borrarlo.

---

## 7. Revisar el historial de migraciones (opcional) ✅ Hecha (24-10-2026)

> **Hecho por el agente:** `apply_migration` volvió a funcionar. M1 + M2 quedaron registradas como `orders_checkout_fields_place_order_v2` en *Database → Migrations*. Se usó el SQL actual (idempotente), así que no cambió nada en la tienda. Los advisors mostraron dos avisos nuevos por haber activado los anónimos: uno esperado (las políticas también cubren a los invitados) y uno para ti antes de producción: activar *Leaked password protection* en *Authentication → Sign In / Providers → Email* (o *Password security*).

**Por qué:** la herramienta `apply_migration` del MCP de Supabase falló dos veces con el error *Invalid or expired requestState*. El agente aplicó el mismo SQL de otra forma (`execute_sql`, dentro de una transacción). El cambio está en la base de datos y en `documentación/03-base-de-datos/sql/ecommerce_schema.sql`, pero **no aparece** en *Database → Migrations* de Supabase.

**Qué hacer:** nada, salvo que uses el historial de migraciones para desplegar en otro proyecto. En ese caso, ejecuta `ecommerce_schema.sql` completo (es idempotente) o pide al agente que registre la migración. Si el error se repite, revisa los permisos del MCP de Supabase en Claude Code.

---

## Revisión final (24-10-2026)

Revisado por el agente después de que diste las tareas por hechas:

- ✅ Hechas: 1 (anónimos), 2 (Redirect URLs), 4 (express solo RM), 5 (feriados).
- ⏳ **Para antes de producción**, sin apuro:
  - **Tarea 2:** probar la confirmación con un correo real. En Supabase no aparece ninguna cuenta creada desde `/ingresar`.
  - **Tarea 3:** el retiro sigue con los datos ficticios (Av. Manuel Montt 1530, Local 4).
  - **Tarea 6:** siguen 4 usuarios de prueba en *Authentication → Users* (`prueba.fase5@almacen.cl` y 3 anónimos).
  - **Nuevo:** activar *Leaked password protection* en Supabase Auth (aviso de los advisors).

Estos puntos quedaron en el [checklist de producción](../07-referencia/checklist-produccion.md).

## Cuando termines

Avísale al agente qué hiciste (por ejemplo: *"Activé los anónimos y agregué la Redirect URL; la dirección de la tienda es …; express solo RM"*). El agente:

1. Prueba un pedido completo como invitado.
2. Aplica la dirección real y la regla del express.
3. Actualiza [08-estado/avance.md](../08-estado/avance.md) y el [registro de cambios](../08-estado/registro-de-cambios.md).

Después sigue la **fase 6: pagos** (Webpay Plus, Flow, transferencia y vencimiento de pedidos).
