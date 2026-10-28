import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutGate } from "@/components/checkout/checkout-gate";
import { CheckoutView } from "@/components/checkout/checkout-view";
import styles from "@/components/checkout/checkout.module.css";
import { getSessionUser } from "@/lib/auth/session";
import { shippingDefaultsFrom, type ShippingDefaults } from "@/lib/checkout/defaults";
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
  return <CheckoutView email={user.email} defaults={await savedDefaults(user.id)} />;
}

// La dirección principal (o la última) y el perfil precargan el paso Despacho: el RUT sale de
// Datos personales (decisión 7a) y el checkout no lo escribe en el perfil
async function savedDefaults(userId: string): Promise<ShippingDefaults> {
  const supabase = await createSupabaseServer();
  const [address, profile] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, recipient_name, phone, line1, line2, city, region")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, full_name, phone, rut")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (address.error) throw address.error;
  if (profile.error) throw profile.error;
  return shippingDefaultsFrom(address.data, profile.data);
}
