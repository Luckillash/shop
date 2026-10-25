import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutGate } from "@/components/checkout/checkout-gate";
import { CheckoutView } from "@/components/checkout/checkout-view";
import styles from "@/components/checkout/checkout.module.css";
import { getSessionUser } from "@/lib/auth/session";
import { EMPTY_SHIPPING, type ShippingDefaults } from "@/lib/checkout/defaults";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// Template Checkout. La sesión (normal o anónima) se lee dentro de <Suspense> (Cache Components):
// el título queda en el shell estático y el resto llega con la petición.
export default function CheckoutPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Finaliza tu compra</h1>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando el checkout" />}>
        <Checkout />
      </Suspense>
    </main>
  );
}

async function Checkout() {
  const user = await getSessionUser();
  if (!user) return <CheckoutGate />;
  return <CheckoutView email={user.email} defaults={await savedAddress(user.id)} />;
}

// La dirección por defecto (o la última) precarga el paso Despacho. addresses no guarda el RUT
async function savedAddress(userId: string): Promise<ShippingDefaults> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, recipient_name, phone, line1, line2, city, region")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_SHIPPING;

  const [firstName, ...rest] = data.recipient_name.split(" ");
  return {
    ...EMPTY_SHIPPING,
    addressId: data.id,
    firstName,
    lastName: rest.join(" "),
    phone: data.phone ?? "",
    region: data.region ?? "",
    commune: data.city,
    street: data.line1,
    apartment: data.line2 ?? "",
  };
}
