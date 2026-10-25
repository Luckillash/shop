import type { ReactNode } from "react";
import { CheckoutFooter } from "@/components/layout/checkout-footer";
import { CheckoutHeader } from "@/components/layout/checkout-header";

// Checkout y resultado del pago: header y footer reducidos, sin navegación.
// Las páginas (/checkout, /pedido/[id]) llegan en las fases 5 y 6.
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CheckoutHeader />
      {children}
      <CheckoutFooter />
    </>
  );
}
