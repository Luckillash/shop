"use client";

import Link from "next/link";
import { usePaymentUi } from "@/store/payment-ui-store";

// *Volver al carro* del header del checkout: sin enlace mientras se paga
export function BackToCart({ className }: { className?: string }) {
  const paying = usePaymentUi((s) => s.paying);
  if (paying) {
    return (
      <span className={className} aria-disabled="true">
        Volver al carro
      </span>
    );
  }
  return (
    <Link href="/carro" className={className}>
      Volver al carro
    </Link>
  );
}
