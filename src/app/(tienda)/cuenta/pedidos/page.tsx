import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderCard } from "@/components/account/order-card";
import styles from "@/components/account/account.module.css";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getSessionUser } from "@/lib/auth/session";
import { getMyOrders } from "@/lib/orders/account";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

// Template MisPedidos / MisPedidosMovil. Requiere una sesión no anónima: el invitado ve sus
// pedidos en la Confirmación y en el correo (convertirlo en cuenta es la 7.2).
export default function OrdersPage() {
  return (
    <section aria-labelledby="mis-pedidos" className={styles.section}>
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders />
      </Suspense>
    </section>
  );
}

function OrdersSkeleton() {
  return (
    <>
      <Heading />
      <div className={styles.skeleton} aria-busy="true" aria-label="Cargando tus pedidos" />
    </>
  );
}

function Heading({ count }: { count?: number }) {
  return (
    <div className={styles.heading}>
      <h1 id="mis-pedidos" className={styles.title}>
        Mis pedidos
      </h1>
      {count !== undefined && count > 0 && (
        <p className={styles.lead}>{count === 1 ? "1 pedido" : `${count} pedidos`}</p>
      )}
    </div>
  );
}

async function Orders() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect("/ingresar?volver=/cuenta/pedidos");

  const orders = await getMyOrders(user.id);
  const now = new Date();

  if (orders.length === 0) {
    return (
      <>
        <Heading count={0} />
        {/* Estado vacío sin diseño: textos propuestos (pendientes-del-dueno-fase-7.md) */}
        <div className={styles.empty}>
          <span className={styles.emptyMark}>
            <Icon name="truck" size={32} />
          </span>
          <h2 className={styles.emptyTitle}>Todavía no tienes pedidos</h2>
          <p className={styles.lead}>
            Cuando compres, aquí vas a ver el estado de cada pedido y cuándo llega. Si compraste como invitado, el
            detalle está en el correo que te enviamos.
          </p>
          <Button href="/" size="lg">
            Explorar la tienda
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Heading count={orders.length} />
      <ul className={styles.orders}>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} now={now} />
        ))}
      </ul>
    </>
  );
}
