# Plantillas de los correos de Supabase Auth

En español y con el estilo de los correos de pedidos (`src/lib/email/templates.ts`). Se pegan a mano en
Supabase → **Authentication → Emails → Templates** (asunto y cuerpo, en *Source*). Son Go templates de Supabase:
`{{ .Email }}`, `{{ .NewEmail }}`, `{{ .TokenHash }}`, `{{ .RedirectTo }}`, `{{ .SiteURL }}`, `{{ .Token }}`.

| Plantilla en Supabase | Archivo | Asunto |
|---|---|---|
| Confirm sign up | `confirmation.html` | Confirma tu correo para activar tu cuenta |
| Reset password | `recovery.html` | Crea una contraseña nueva |
| Change email address | `email_change.html` | Confirma tu correo |
| Magic link | `magic_link.html` | Tu enlace para ingresar |
| Invite user | `invite.html` | Te invitamos a Almacén |
| Reauthentication | `reauthentication.html` | Tu código de verificación |

## Enlaces

Todos llevan a `/auth/confirm` con `token_hash` (`verifyOtp` en el servidor), así que funcionan aunque el correo se
abra en otro navegador (la plantilla por defecto usa PKCE y solo sirve en el mismo navegador).

- **Crear cuenta, contraseña nueva y cambio de correo** usan `{{ .RedirectTo }}&token_hash=…`. `RedirectTo` es el
  `emailRedirectTo`/`redirectTo` que manda la app (`confirmUrl` en `src/lib/auth/actions.ts`), que siempre trae
  `?volver=<ruta>`: así el usuario vuelve a donde estaba (por ejemplo al checkout) y en local el enlace apunta a local.
  Esa URL tiene que estar en *Redirect URLs*; si no, Supabase la cambia por la *Site URL* y el enlace queda roto.
- **Magic link e invitación** no los pide la app (solo desde el panel de Supabase): usan `{{ .SiteURL }}`, con
  `volver=/cuenta` y `volver=/ingresar/nueva-contrasena`.
- **Cambio de correo** tiene dos versiones: sin correo anterior (`{{ if .Email }}` vacío) es el invitado que crea su
  cuenta desde la Confirmación (7.2, D-027); con correo anterior, un cambio de correo normal.

Si cambias el texto o el estilo, cambia los seis archivos igual (comparten el mismo `layout`) y vuelve a pegarlos.

**26-10-2026 (7.3):** el `layout` pasó al del artboard `CorreoConfirmacion` (logo en Georgia, márgenes del diseño, pie fuera de la tarjeta), igual que los correos de pedidos. Los textos, enlaces y asuntos no cambiaron. El dueño volvió a pegar los cuerpos el mismo día (T7 de `documentación/_archivo/pendientes-del-dueno-fase-7.md`), verificado con *Crea una contraseña nueva*. El `<style>` lleva espacios entre las llaves para no confundirse con las de los Go templates.
