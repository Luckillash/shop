"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeCouponCode } from "@/lib/cart/coupon";
import { syncUserCart } from "@/lib/cart/server";
import { sanitizeLines } from "@/lib/cart/snapshot";
import { startPaymentOrRedirect } from "@/lib/payments/start";
import { getRedis } from "@/lib/redis";
import { createRateLimiter, ORDER_RATE_LIMIT } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { CartItem } from "@/store/cart-store";
import {
  DELIVERY_COMMUNE_COOKIE,
  DELIVERY_COMMUNE_MAX_AGE,
  serializeDeliveryCommune,
  type DeliveryCommune,
} from "./delivery-commune";
import { GENERIC_ORDER_ERROR, orderFailure } from "./order-errors";
import {
  normalizeEmail,
  validateContact,
  validatePayment,
  validateShipping,
  type FieldErrors,
  type ShippingData,
} from "./validation";

// Checkout en 3 pasos (06-implementacion/checkout-y-pedidos.md). Cada acción vuelve a verificar la
// sesión (normal o anónima) y a validar todo: lo que manda el cliente no es confiable.
// Contacto y Despacho no crean el pedido; Pago sincroniza cart_items y llama a place_order.

const rateLimiter = createRateLimiter(getRedis);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_EXPIRED = "Tu sesión terminó. Vuelve a ingresar o compra como invitado para continuar.";

async function sessionClient() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

// Recuerda la comuna para la fecha de entrega de la Ficha (B35). No es httpOnly: la Ficha la lee
// en el navegador (delivery-commune.ts). Solo lleva región y comuna, validadas al leerlas
async function rememberCommune(value: DeliveryCommune): Promise<void> {
  (await cookies()).set(DELIVERY_COMMUNE_COOKIE, serializeDeliveryCommune(value), {
    maxAge: DELIVERY_COMMUNE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}

// ----- Paso 1 · Contacto -----

export type ContactState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; email: string }
  | { status: "saved"; email: string };

export async function saveContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const email = String(formData.get("email") ?? "");
  const parsed = validateContact({ email });
  if (!parsed.ok) return { status: "error", errors: parsed.errors, email };
  return { status: "saved", email: parsed.data.email };
}

// ----- Paso 2 · Despacho -----

/** Lo que el paso Pago necesita del despacho (y lo que muestra en su resumen) */
export type ShippingSelection = ShippingData & {
  /** addresses.id; null en retiro en tienda */
  addressId: string | null;
};

export type ShippingState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "saved"; selection: ShippingSelection };

function shippingInput(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    rut: formData.get("rut"),
    phone: formData.get("phone"),
    region: formData.get("region"),
    commune: formData.get("commune"),
    street: formData.get("street"),
    apartment: formData.get("apartment"),
    method: formData.get("method"),
  };
}

/** Valida el despacho y guarda la dirección en addresses (RLS: solo el dueño). No crea el pedido */
export async function saveShipping(_prev: ShippingState, formData: FormData): Promise<ShippingState> {
  const parsed = validateShipping(shippingInput(formData));
  if (!parsed.ok) return { status: "error", errors: parsed.errors };

  const { supabase, userId } = await sessionClient();
  if (!userId) return { status: "error", errors: {}, message: SESSION_EXPIRED };

  const data = parsed.data;
  if (!data.address) return { status: "saved", selection: { ...data, addressId: null } };
  await rememberCommune({ region: data.address.region, commune: data.address.commune });

  const row = {
    recipient_name: `${data.firstName} ${data.lastName}`,
    phone: data.phone,
    line1: data.address.street,
    line2: data.address.apartment,
    city: data.address.commune,
    region: data.address.region,
    country: "CL",
  };

  try {
    // Si ya tenía una dirección guardada, se actualiza (RLS impide tocar la de otro usuario)
    const previous = String(formData.get("addressId") ?? "");
    if (UUID.test(previous)) {
      const updated = await supabase
        .from("addresses")
        .update(row)
        .eq("id", previous)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (updated.data) return { status: "saved", selection: { ...data, addressId: updated.data.id } };
    }

    const existing = await supabase.from("addresses").select("id").eq("user_id", userId).eq("is_default", true);
    if (existing.error) throw existing.error;
    const inserted = await supabase
      .from("addresses")
      .insert({ ...row, user_id: userId, is_default: existing.data.length === 0 })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    return { status: "saved", selection: { ...data, addressId: inserted.data.id } };
  } catch (error) {
    console.error("[checkout] saveShipping", error);
    return { status: "error", errors: {}, message: "No pudimos guardar tu dirección. Vuelve a intentarlo." };
  }
}

// ----- Paso 3 · Pago -----

export type PaymentState =
  | { status: "idle" }
  | {
      status: "error";
      errors: FieldErrors;
      /** Notice danger del paso: error de place_order, sesión o red */
      message?: string;
      /** Carro corregido con la BD: el cliente reemplaza su store */
      items?: CartItem[];
      dropCoupon?: boolean;
    }
  /** Pedido creado: el cliente envía el formulario POST con token_ws a Webpay (trampa 8) */
  | { status: "webpay"; url: string; token: string };

function parseJson(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(value ?? "null"));
  } catch {
    return null;
  }
}

/**
 * *Pagar $TOTAL*: valida los 3 pasos, sincroniza cart_items con el carro del cliente, crea el
 * pedido con place_order (cliente del usuario: necesita auth.uid(), trampa 12) y empieza el pago:
 * Webpay devuelve { url, token } para el formulario POST; Flow y la transferencia redirigen.
 * El total que se cobra sale de orders.total (start_payment_attempt), nunca del cliente.
 */
export async function placeOrder(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const payment = validatePayment({
    paymentMethod: formData.get("paymentMethod"),
    documentType: formData.get("documentType"),
    businessName: formData.get("businessName"),
    businessRut: formData.get("businessRut"),
    activity: formData.get("activity"),
    terms: formData.get("terms"),
  });
  if (!payment.ok) return { status: "error", errors: payment.errors };

  // Contacto y despacho vienen del estado del cliente: se validan otra vez
  const email = normalizeEmail(formData.get("contactEmail"));
  const selection = parseJson(formData.get("shipping")) as Partial<ShippingSelection> | null;
  const shipping = validateShipping({
    ...selection,
    region: selection?.address?.region,
    commune: selection?.address?.commune,
    street: selection?.address?.street,
    apartment: selection?.address?.apartment,
  });
  const addressId = typeof selection?.addressId === "string" && UUID.test(selection.addressId) ? selection.addressId : null;
  if (!email || !shipping.ok || (shipping.data.method !== "pickup" && !addressId)) {
    return { status: "error", errors: {}, message: "Faltan datos del pedido. Revisa los pasos anteriores." };
  }

  const { supabase, userId } = await sessionClient();
  if (!userId) return { status: "error", errors: {}, message: SESSION_EXPIRED };

  if (await rateLimiter.isLimited(ORDER_RATE_LIMIT, userId)) {
    return { status: "error", errors: {}, message: "Hiciste muchos pedidos seguidos. Espera unos minutos y vuelve a intentarlo." };
  }

  const lines = sanitizeLines(parseJson(formData.get("cart")));
  if (lines.length === 0) return { status: "error", errors: {}, message: orderFailure({ hint: "empty_cart" }).message };

  let orderId: string;
  let productIds: string[];
  try {
    // 1. cart_items = el carro del cliente (place_order lee la BD, no Zustand: trampa 13)
    const synced = await syncUserCart(supabase, userId, lines);
    const changed =
      synced.lines.length !== lines.length ||
      synced.lines.some((l, i) => l.variantId !== lines[i].variantId || l.quantity !== lines[i].quantity);
    if (changed) {
      return {
        status: "error",
        errors: {},
        message: "Cambió el stock de algunos productos y ajustamos tu carro. Revisa el resumen y vuelve a pagar.",
        items: synced.items,
      };
    }
    productIds = [...new Set(synced.items.map((i) => i.productId))];

    // 2. place_order: cuenta como intento aunque falle (cada pedido reserva stock)
    await rateLimiter.hit(ORDER_RATE_LIMIT, userId);
    const data = shipping.data;
    const { data: id, error } = await supabase.rpc("place_order", {
      p_shipping_method: data.method,
      p_payment_method: payment.data.paymentMethod,
      p_contact_email: email,
      p_customer_rut: data.rut,
      p_shipping_address_id: data.method === "pickup" ? undefined : addressId!,
      p_recipient_name: data.method === "pickup" ? `${data.firstName} ${data.lastName}` : undefined,
      p_recipient_phone: data.method === "pickup" ? data.phone : undefined,
      p_document_type: payment.data.documentType,
      p_invoice: payment.data.invoice ?? undefined,
      p_coupon_code: normalizeCouponCode(formData.get("couponCode")) ?? undefined,
    });

    if (error) {
      const failure = orderFailure(error);
      if (failure.message === GENERIC_ORDER_ERROR) console.error("[checkout] place_order", error);
      if (!failure.refreshCart) return { status: "error", errors: {}, message: failure.message };
      // El stock o el cupón cambiaron entre la sincronización y el pedido: se devuelve el carro real
      const fresh = await syncUserCart(supabase, userId, lines);
      return { status: "error", errors: {}, message: failure.message, items: fresh.items, dropCoupon: failure.dropCoupon };
    }
    orderId = id;
  } catch (error) {
    console.error("[checkout] placeOrder", error);
    return { status: "error", errors: {}, message: GENERIC_ORDER_ERROR };
  }

  // 3. El stock cambió: la Ficha y el Listado no deben seguir mostrando el anterior
  for (const productId of productIds) revalidateTag(`stock:${productId}`, "max");
  revalidateTag("products", "max");

  // 4. Primer intento de pago (D-013: buy_order = <order_number>-1)
  const started = await startPaymentOrRedirect(orderId, payment.data.paymentMethod);
  if (started.status === "webpay") return started;
  // La pasarela no respondió: el pedido ya existe (y el stock está reservado), así que no se
  // vuelve al checkout (otro *Pagar* crearía un segundo pedido). Pago rechazado muestra el aviso
  // de conexión con *Elige cómo pagar*
  redirect(`/pedido/${orderId}/pago-rechazado`);
}
