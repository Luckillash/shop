import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddressBook } from "@/components/account/address-book";
import styles from "@/components/account/account.module.css";
import { getMyAddresses } from "@/lib/account/queries";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Direcciones", robots: { index: false } };

// Template Direcciones / DireccionesMovil (7.5). Requiere una sesión no anónima (D-026).
export default function AddressesPage() {
  return (
    <section aria-labelledby="direcciones" className={styles.section}>
      <Suspense fallback={<AddressesSkeleton />}>
        <Addresses />
      </Suspense>
    </section>
  );
}

function AddressesSkeleton() {
  return (
    <>
      <div className={styles.heading}>
        <h1 id="direcciones" className={styles.title}>
          Direcciones
        </h1>
        <p className={styles.lead}>La principal se completa sola en el checkout.</p>
      </div>
      <div className={styles.skeleton} aria-busy="true" aria-label="Cargando tus direcciones" />
    </>
  );
}

async function Addresses() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect("/ingresar?volver=/cuenta/direcciones");
  return <AddressBook addresses={await getMyAddresses(user.id)} />;
}
