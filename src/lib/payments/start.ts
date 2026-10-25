import "server-only";
import { redirect } from "next/navigation";
import { STORE } from "@/lib/store";
import { GATEWAY_NAMES, type PaymentProvider } from "./labels";
import { AttemptError, startAttempt } from "./service";

// Inicia un intento desde una Server Action (placeOrder, retryPayment) y lleva al usuario a donde
// corresponde: Webpay necesita un POST con token_ws, así que se devuelve { url, token } y el
// cliente envía el formulario (trampa 8); Flow y la transferencia se redirigen desde aquí.

export type PaymentStart =
  | { status: "webpay"; url: string; token: string }
  | { status: "error"; message: string };

export async function startPaymentOrRedirect(orderId: string, provider: PaymentProvider): Promise<PaymentStart> {
  let target: string;
  try {
    const started = await startAttempt(orderId, provider);
    if (started.kind === "webpay") return { status: "webpay", url: started.url, token: started.token };
    target = started.kind === "flow" ? started.url : `/pedido/${orderId}/transferencia`;
  } catch (error) {
    if (!(error instanceof AttemptError)) {
      console.error("[payments] startPayment", error);
      return { status: "error", message: "No pudimos iniciar el pago. Intenta de nuevo en unos minutos." };
    }
    switch (error.reason) {
      case "gateway":
        if (provider === "transfer") return { status: "error", message: "No pudimos registrar la transferencia. Intenta de nuevo." };
        return {
          status: "error",
          message: `No pudimos conectar con ${GATEWAY_NAMES[provider]}. Intenta de nuevo en unos minutos o elige otro medio de pago.`,
        };
      case "too_many":
        return {
          status: "error",
          message: `Hiciste muchos intentos de pago para este pedido. Escríbenos a ${STORE.contactEmail} y te ayudamos.`,
        };
      default:
        // Pagado, vencido, anulado o inexistente: la página del pedido muestra el estado real
        target = `/pedido/${orderId}`;
    }
  }
  // redirect() lanza: fuera del try (docs de redirect)
  redirect(target);
}
