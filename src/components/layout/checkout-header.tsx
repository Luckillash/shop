import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { STORE } from "@/lib/store";
import { BackToCart } from "./back-to-cart";
import styles from "./checkout-chrome.module.css";

// Header reducido del checkout: sin navegación, para no distraer del pago.
// Mientras se paga, *Volver al carro* queda sin enlace (BackToCart lee usePaymentUi).
export function CheckoutHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logo}>
          {STORE.name}
        </Link>
        <span className={styles.secure}>
          <Icon name="lock" />
          Pago seguro
        </span>
        <BackToCart className={styles.back} />
      </div>
    </header>
  );
}
