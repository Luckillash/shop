import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/validation";
import { createSupabaseServer } from "@/lib/supabase/server";

// Enlace del correo de confirmación de Supabase Auth. Acepta las dos formas:
//   ?token_hash=…&type=signup  (plantilla con {{ .TokenHash }}, recomendada para SSR)
//   ?code=…                    (flujo PKCE de la plantilla por defecto)
// Sirve para confirmar la cuenta (type=signup) y para recuperar la contraseña (type=recovery,
// vuelve a /ingresar/nueva-contrasena).
// La URL debe estar en Authentication → URL Configuration → Redirect URLs de Supabase.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("volver"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createSupabaseServer();

  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Faltan token_hash o code") };

  if (error) {
    console.error("[auth] confirm", error);
    const recovery = type === "recovery" || next.startsWith("/ingresar/nueva-contrasena");
    return NextResponse.redirect(new URL(recovery ? "/ingresar/recuperar?error=enlace" : "/ingresar?error=confirmacion", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
