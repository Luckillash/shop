import Link from "next/link";
import { STORE } from "@/lib/store";
import styles from "./checkout-chrome.module.css";

// Footer reducido del checkout: solo enlaces legales y de ayuda
export function CheckoutFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© 2026 {STORE.name}</span>
        <span className={styles.footerLinks}>
          <Link href="/ayuda/terminos">Términos y condiciones</Link>
          <Link href="/ayuda/privacidad">Política de privacidad</Link>
          <Link href="/ayuda/contacto">Ayuda con tu compra</Link>
        </span>
      </div>
    </footer>
  );
}
