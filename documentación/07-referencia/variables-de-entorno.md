---
title: "Variables de entorno"
description: "Todas las variables de entorno, actuales y previstas: para qué sirven, si son públicas o secretas, sus valores de desarrollo y el problema de .gitignore con .env.example."
keywords: ["env", ".env.local", ".env.example", "variables de entorno", "REDIS_URL", "SUPABASE", "SERVICE_ROLE", "WEBPAY", "FLOW", "CRON_SECRET", "NEXT_PUBLIC", "secretos"]
related: ["01-fundamentos/entorno-local.md", "06-implementacion/integrar-supabase.md", "07-referencia/checklist-produccion.md"]
source: [".env.example", ".gitignore", "src/lib/redis.ts", "src/lib/payments/config.ts", "src/lib/email/send.ts"]
estado: "vigente"
---

# Variables de entorno

> **Úsalo cuando:** agregas configuración, o algo falla por una variable que falta.

## Tabla

| Variable | Estado | Pública | Valor de desarrollo | Uso |
|---|---|---|---|---|
| `REDIS_URL` | ✅ en uso | No | `redis://localhost:6379` (es también el valor por defecto en el código) | `src/lib/redis.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ en uso | Sí | `https://nswchmyzgcutyehhuche.supabase.co` | Clientes de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ en uso | Sí | MCP `supabase` → `get_publishable_keys` (`sb_publishable_…`) | `src/lib/supabase/config.ts`: clientes público y de usuario, y el proxy |
| `SUPABASE_SECRET_KEY` | ✅ en uso (verificada el 2026-10-23) | **No (secreta)** | Dashboard → Project Settings → API Keys (`sb_secret_…`; la legacy `service_role` también sirve) | `src/lib/supabase/admin.ts`: pasarelas y crons |
| `NEXT_PUBLIC_SITE_URL` | ✅ en uso (fase 6) | Sí | `http://localhost:3310` (el puerto de `next start`; con túnel, su URL) | `return_url` de Webpay, `urlReturn`/`urlConfirmation`/`urlCallBack` de Flow, enlaces de los correos, destino de los 303 de los retornos. Queda fija en el build |
| `WEBPAY_ENV` | ✅ en uso | No | `integration` | Elige el host de Transbank (`production` → `webpay3g.transbank.cl`) |
| `WEBPAY_COMMERCE_CODE` | ✅ en uso | No | `597055555532` | Header `Tbk-Api-Key-Id` |
| `WEBPAY_API_KEY` | ✅ en uso | **No** | `579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C` (de integración, es pública) | Header `Tbk-Api-Key-Secret` |
| `FLOW_API_URL` | ✅ en uso | No | `https://sandbox.flow.cl/api` | URL base. No la escribas en el código |
| `FLOW_API_KEY` | ✅ en uso | No | Las de sandbox de `../flow/.env` (`API_KEY`) | `apiKey` |
| `FLOW_SECRET_KEY` | ✅ en uso | **No** | Las de sandbox de `../flow/.env` (`SECRET_KEY`) | Firma `s` |
| `CRON_SECRET` | ✅ en uso | **No** | String aleatorio de 64 hex (`crypto.randomBytes(32)`) | `Authorization: Bearer …` de `/api/cron/expirar-pedidos` (Vercel Cron lo envía solo si la variable existe en el proyecto). En producción, un valor distinto al local |
| `BANK_NAME`, `BANK_ACCOUNT_TYPE`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER`, `BANK_ACCOUNT_RUT`, `BANK_ACCOUNT_EMAIL` | ✅ en uso (**reales** desde el 25-10-2026) | No | `.env.local`: Itaú · Cuenta corriente · 0232155780 · Lucas Ignacio Salazar Cartes · 20.630.500-2 · lucassalazarc@outlook.com. `.env.example` conserva los de ejemplo del diseño | *Transferencia pendiente* y el correo con los datos (`bankDetails()` en `src/lib/payments/config.ts`). ✅ También en Vercel (Production y Preview) |
| `RESEND_API_KEY` | ✅ en uso (desde el 25-10-2026) | **No** | Llave `almacen-local` de Resend (`re_…`, *Sending access*, solo `mail.audazia.dev`). Vacía: los correos se omiten con un aviso `[email] Sin RESEND_API_KEY…` | `src/lib/email/send.ts` (D-022). En producción, otra llave (`almacen-produccion`) |
| `BEST_SELLERS_SINCE` | ✅ en uso (fase 7.7, D-032) · **sin definir en Vercel** | No | Vacía en `.env.local`. Para probar: `2026-01-01T00:00:00-03:00` | Fecha ISO desde la que *Los más vendidos* cuenta los pedidos pagados (`src/app/(tienda)/page.tsx` → `getBestSellers`). Vacía o inválida: el Inicio muestra *Destacados*. Se lee en el build **y** en cada revalidación del Inicio (trampa 93): en Vercel, definirla en Production al lanzar y redesplegar (T17) |
| `EMAIL_FROM` | ✅ en uso | No | `Almacén <pedidos@mail.audazia.dev>` | Remitente; el dominio (`mail.audazia.dev`) está verificado en Resend. El nombre *Almacén* se queda por ahora (dueño, 26-10-2026); si cambia, cambiarlo también en el SMTP de Supabase Auth |

`GITHUB_PERSONAL_ACCESS_TOKEN` no es de la app: la usa el MCP `github` y vive como variable de entorno del usuario de Windows (no en `.env.local`). Token *fine-grained* limitado al repositorio `Luckillash/shop`.

Las credenciales que usan los MCP `flow` y `transbank` viven en `../flow/.env` y `../transbank/.env`. Esos archivos **no** los lee la app: las de Flow sandbox se copiaron a `.env.local` el 2026-10-25.

## Reglas

- `NEXT_PUBLIC_*` se incluye en el JavaScript del navegador al compilar. Nunca pongas un secreto con ese prefijo.
- Los módulos que leen secretos llevan `import "server-only"`.
- Lee las variables en un solo lugar por dominio (por ejemplo, `src/lib/payments/config.ts`) y falla con un mensaje claro si falta alguna.
- Las variables `NEXT_PUBLIC_*` quedan fijas en el build: si cambian, hay que volver a compilar.

## `.env.example` se versiona

`.gitignore` ignora `.env*`, pero desde la fase 0 tiene la excepción `!.env.example`. Cuando agregues una variable, pon su nombre (sin valores secretos) en `.env.example`. (El proyecto todavía no es un repositorio git.)
