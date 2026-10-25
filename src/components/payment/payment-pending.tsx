"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { checkPayment } from "@/lib/payments/actions";
import { screenPath } from "@/lib/payments/screen";
import styles from "./payment.module.css";

const INTERVAL_MS = 3000;
const MAX_CHECKS = 10;

// *Estamos confirmando tu pago*: el usuario volvió de la pasarela, pero el resultado no está
// (Flow con status 1, o el retorno de Webpay lo está confirmando otra pestaña). Vuelve a consultar
// cada 3 s, hasta 10 veces, y lleva a la pantalla que corresponda cuando cambia.
export function PaymentPending({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  const done = checks >= MAX_CHECKS;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(async () => {
      try {
        const screen = await checkPayment(orderId);
        if (screen && screen !== "confirming") {
          const path = screenPath(orderId, screen);
          if (path === `/pedido/${orderId}`) router.refresh();
          else router.replace(path);
          return;
        }
      } catch (error) {
        console.error("[pago] checkPayment", error);
      }
      setChecks((n) => n + 1);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [checks, done, orderId, router]);

  if (!done) return null;
  return (
    <div className={styles.actions}>
      <Button onClick={() => setChecks(0)}>Volver a revisar</Button>
    </div>
  );
}
