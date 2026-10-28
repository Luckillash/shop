import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "./config";
import { guardedRoute, loginPath, needsLogin } from "./proxy-routes";

type Claims = { sub?: string; is_anonymous?: boolean } | undefined;
type Supabase = ReturnType<typeof createServerClient<Database>>;

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

  const route = guardedRoute(request.nextUrl.pathname);
  if (route === null) return response;
  const claims: Claims = data?.claims;

  // El resto de /cuenta/* (7.8): basta el JWT que ya validó getClaims(), sin otra consulta.
  // Corre también en los prefetch y las navegaciones: Next 16 le oculta al proxy la cabecera rsc
  // (trampa 95), así que no se pueden distinguir de la carga directa.
  if (route.kind === "account") {
    return needsLogin(claims) ? withSession(response, loginRedirect(request)) : response;
  }
  if (route.kind === "order-detail") {
    return guardOrderDetail(request, response, supabase, claims, route.orderNumber);
  }
  return guardAdmin(request, response, supabase, claims);
}

/** La sesión refrescada (cookies y su Cache-Control) también va en el redirect o el 404 */
function withSession(response: NextResponse, next: NextResponse) {
  response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
  const cacheControl = response.headers.get("cache-control");
  if (cacheControl) next.headers.set("cache-control", cacheControl);
  return next;
}

/** A Ingresar con volver = la ruta y su query (Ingresar la valida con safeNext) */
function loginRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL(loginPath(request.nextUrl.pathname, request.nextUrl.search), request.url));
}

/**
 * /admin con el código HTTP correcto (las páginas son de prerender parcial, trampa 75): sin sesión no
 * anónima → Ingresar; sin el rol → 404, para no revelar que la administración existe (D-025). Es
 * optimista: el layout, cada página (requireAdmin) y cada Server Action (getAdminUser) vuelven a verificar.
 */
async function guardAdmin(request: NextRequest, response: NextResponse, supabase: Supabase, claims: Claims) {
  if (needsLogin(claims)) return withSession(response, loginRedirect(request));
  const { data, error } = await supabase.rpc("is_admin");
  // Si la consulta falla, decide la página
  if (error || data === true) return response;
  return withSession(response, NextResponse.rewrite(new URL("/admin-no-encontrada", request.url)));
}

/**
 * Detalle de pedido (/cuenta/pedidos/[orderNumber]) con el código HTTP correcto: la página es de
 * prerender parcial y su shell sale con 200 antes de leer el pedido (trampa 48, D-026). Sin sesión
 * no anónima → redirect a Ingresar; número ajeno, inválido o inexistente → 404. Es una comprobación
 * optimista: la página vuelve a verificar la sesión y el pedido.
 */
async function guardOrderDetail(
  request: NextRequest,
  response: NextResponse,
  supabase: Supabase,
  claims: Claims,
  orderNumber: string,
) {
  const userId = claims?.sub;
  if (!userId || needsLogin(claims)) return withSession(response, loginRedirect(request));

  let found = false;
  if (/^\d{1,12}$/.test(orderNumber)) {
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("order_number", Number(orderNumber))
      .maybeSingle();
    // Si la consulta falla, decide la página
    if (error) return response;
    found = data !== null;
  }
  if (found) return response;
  // Una ruta sin página: Next responde su 404 (src/app/not-found.tsx) con el código 404
  return withSession(response, NextResponse.rewrite(new URL("/cuenta/pedido-no-encontrado", request.url)));
}
