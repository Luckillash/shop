import type { Metadata } from "next";
import styles from "@/components/payment/payment.module.css";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "No encontramos el pago", robots: { index: false } };

// Destino de los retornos de Webpay y Flow con un token o una orden que no son de la tienda (o si
// falló la consulta). Estática: no lee la sesión ni el pedido.
export default function PaymentNotFoundPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.hero} role="alert">
          <span className={cx(styles.mark, styles.markDanger)}>
            <Icon name="alert" size={32} />
          </span>
          <h1 className={styles.title}>No encontramos ese pago</h1>
          <p className={styles.lead}>
            Puede que el enlace haya vencido. Si te hicieron un cargo, escríbenos a{" "}
            <a href={`mailto:${STORE.contactEmail}`}>{STORE.contactEmail}</a> con el número de pedido y lo revisamos.
          </p>
        </div>
        <div className={styles.actions}>
          <Button href="/carro" size="lg">
            Volver al carro
          </Button>
          <Button href="/" variant="ghost" size="lg">
            Seguir comprando
          </Button>
        </div>
      </div>
    </main>
  );
}
