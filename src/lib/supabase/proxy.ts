import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./config";

// Refresca el token de Supabase y lo deja en el request (para los Server Components)
// y en la respuesta (para el navegador). Patrón de la documentación de Supabase.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // No agregar código entre createServerClient y getClaims(): podría cerrar sesiones al azar
  const { data } = await supabase.auth.getClaims();

  const orderNumber = ORDER_DETAIL.exec(request.nextUrl.pathname)?.[1];
  // Solo la carga directa del documento: los prefetch y las navegaciones (cabecera rsc) no muestran
  // el código HTTP y no deben costar una consulta por cada tarjeta de Mis pedidos
  if (orderNumber !== undefined && !request.headers.has("rsc")) {
    return guardOrderDetail(request, response, supabase, data?.claims, orderNumber);
  }

  return response;
}

const ORDER_DETAIL = /^\/cuenta\/pedidos\/([^/]+)\/?$/;

/**
 * Detalle de pedido (/cuenta/pedidos/[orderNumber]) con el código HTTP correcto: la página es de
 * prerender parcial y su shell sale con 200 antes de leer el pedido (trampa 48, D-026). Sin sesión
 * no anónima → redirect a Ingresar; número ajeno, inválido o inexistente → 404. Es una comprobación
 * optimista: la página vuelve a verificar la sesión y el pedido.
 */
async function guardOrderDetail(
  request: NextRequest,
  response: NextResponse,
  supabase: ReturnType<typeof createServerClient<Database>>,
  claims: { sub?: string; is_anonymous?: boolean } | undefined,
  orderNumber: string,
) {
  // La sesión refrescada (cookies y su Cache-Control) también va en el redirect o el 404
  const withCookies = (next: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) next.headers.set("cache-control", cacheControl);
    return next;
  };

  if (!claims?.sub || claims.is_anonymous === true) {
    const login = new URL("/ingresar", request.url);
    login.searchParams.set("volver", request.nextUrl.pathname);
    return withCookies(NextResponse.redirect(login));
  }

  let found = false;
  if (/^\d{1,12}$/.test(orderNumber)) {
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", claims.sub)
      .eq("order_number", Number(orderNumber))
      .maybeSingle();
    // Si la consulta falla, decide la página
    if (error) return response;
    found = data !== null;
  }
  if (found) return response;
  // Una ruta sin página: Next responde su 404 (src/app/not-found.tsx) con el código 404
  return withCookies(NextResponse.rewrite(new URL("/cuenta/pedido-no-encontrado", request.url)));
}
