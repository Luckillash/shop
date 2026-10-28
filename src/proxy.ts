import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: proxy.ts reemplaza a middleware.ts. Refresca la sesión y da el código HTTP real de
// /cuenta/* y /admin/* (redirect a Ingresar o 404). Es optimista: los permisos se vuelven a
// verificar en cada página, Server Action y Route Handler.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos los archivos estáticos y las imágenes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
