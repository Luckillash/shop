"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { WebpayRedirect } from "@/components/payment/webpay-redirect";
import { placeOrder, type PaymentState, type ShippingSelection } from "@/lib/checkout/actions";
import { PAYMENT_FIELDS, type FieldErrors, type PaymentField } from "@/lib/checkout/validation";
import { formatCLP } from "@/lib/format/clp";
import { formatRut } from "@/lib/format/rut";
import { PAYMENT_OPTIONS, redirectingLine } from "@/lib/payments/labels";
import type { CartLine } from "@/lib/cart/totals";
import type { CartItem } from "@/store/cart-store";
import { usePaymentUi } from "@/store/payment-ui-store";
import { ErrorSummary, OptionGroup, StepCard } from "./parts";
import styles from "./checkout.module.css";

const LABELS: Record<PaymentField, string> = {
  paymentMethod: "Medio de pago",
  businessName: "Razón social",
  businessRut: "RUT de la empresa",
  activity: "Giro",
  terms: "Términos y condiciones",
};

const DOCUMENT_OPTIONS = [
  { value: "boleta", title: "Boleta" },
  { value: "factura", title: "Factura" },
];

type PaymentStepProps = {
  state: "current" | "pending";
  email: string;
  selection: ShippingSelection | null;
  lines: CartLine[];
  couponCode: string | null;
  total: number;
  /** El servidor corrigió el carro (stock o cupón): el padre actualiza el store */
  onCartChanged: (items: CartItem[] | undefined, dropCoupon: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
};

const IDLE: PaymentState = { status: "idle" };

type Values = {
  paymentMethod: string;
  documentType: "boleta" | "factura";
  businessName: string;
  businessRut: string;
  activity: string;
  terms: boolean;
};

// Paso 3: medio de pago, documento y términos → *Pagar $TOTAL* crea el pedido (place_order) y
// lleva a la pasarela: Webpay con un formulario POST (token_ws), Flow y transferencia por redirect.
// Mientras tanto, *Volver al carro* queda sin enlace (usePaymentUi).
export function PaymentStep({
  state,
  email,
  selection,
  lines,
  couponCode,
  total,
  onCartChanged,
  onPendingChange,
}: PaymentStepProps) {
  const [values, setValues] = useState<Values>({
    paymentMethod: "",
    documentType: "boleta",
    businessName: "",
    businessRut: "",
    activity: "",
    terms: false,
  });
  const [errors, setErrors] = useState<FieldErrors<PaymentField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const setPaying = usePaymentUi((s) => s.setPaying);
  const [result, action, pending] = useActionState(async (prev: PaymentState, formData: FormData) => {
    onPendingChange?.(true);
    setPaying(true);
    let next: PaymentState = prev;
    try {
      // Flow y la transferencia redirigen desde el servidor; Webpay devuelve { url, token }
      next = await placeOrder(prev, formData);
      if (next.status === "error") {
        setErrors(next.errors);
        setMessage(next.message ?? null);
        if (next.items || next.dropCoupon) onCartChanged(next.items, next.dropCoupon ?? false);
      }
      return next;
    } finally {
      // Con Webpay se sigue "pagando" hasta que el formulario sale hacia Transbank
      if (next.status !== "webpay") {
        onPendingChange?.(false);
        setPaying(false);
      }
    }
  }, IDLE);
  const redirecting = result.status === "webpay";

  if (state === "pending" || !selection) {
    return (
      <StepCard step="payment" number={3} state="pending">
        <p className={styles.stepNote}>Elige cómo pagar cuando completes el despacho.</p>
      </StepCard>
    );
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("paymentMethod", values.paymentMethod);
    formData.set("documentType", values.documentType);
    formData.set("businessName", values.businessName);
    formData.set("businessRut", values.businessRut);
    formData.set("activity", values.activity);
    if (values.terms) formData.set("terms", "on");
    formData.set("contactEmail", email);
    formData.set("shipping", JSON.stringify(selection));
    formData.set("cart", JSON.stringify(lines));
    if (couponCode) formData.set("couponCode", couponCode);
    setMessage(null);
    startTransition(() => action(formData));
  }

  const factura = values.documentType === "factura";
  const hasFieldErrors = PAYMENT_FIELDS.some((f) => errors[f]);
  const busy = pending || redirecting;
  const method = values.paymentMethod;
  const statusLine =
    method === "webpay" || method === "flow"
      ? redirectingLine(method, total)
      : `Estamos creando tu pedido por ${formatCLP(total)}. No cierres ni actualices esta página.`;

  return (
    <StepCard step="payment" number={3} state="current">
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy || undefined}>
        {hasFieldErrors && <ErrorSummary errors={errors} order={PAYMENT_FIELDS} labels={LABELS} action="pagar" />}
        {message && <Notice tone="danger">{message}</Notice>}

        <OptionGroup
          name="paymentMethod"
          legend="Medio de pago"
          options={PAYMENT_OPTIONS}
          value={values.paymentMethod || null}
          onChange={(v) => set("paymentMethod", v)}
          error={errors.paymentMethod}
          disabled={busy}
        />

        <OptionGroup
          name="documentType"
          legend="Documento tributario"
          options={DOCUMENT_OPTIONS}
          value={values.documentType}
          onChange={(v) => set("documentType", v as Values["documentType"])}
          inline
          disabled={busy}
        />

        {factura && (
          <fieldset className={styles.fieldset} disabled={busy}>
            <legend className="sr-only">Datos de la factura</legend>
            <div className={styles.fields}>
              <TextField id="businessName" label="Razón social" autoComplete="organization" className={styles.full}
                value={values.businessName} error={errors.businessName}
                onChange={(e) => set("businessName", e.target.value)} />
              <TextField id="businessRut" label="RUT de la empresa" inputMode="numeric" autoComplete="off"
                value={values.businessRut} error={errors.businessRut}
                onChange={(e) => set("businessRut", e.target.value)}
                onBlur={() => setValues((v) => ({ ...v, businessRut: v.businessRut && formatRut(v.businessRut) }))} />
              <TextField id="activity" label="Giro" value={values.activity} error={errors.activity}
                onChange={(e) => set("activity", e.target.value)} />
            </div>
          </fieldset>
        )}

        <fieldset className={cx(styles.fieldset, errors.terms && styles.invalid)} disabled={busy}>
          <legend className="sr-only">Términos</legend>
          <label className={styles.check}>
            <input
              id="terms"
              type="checkbox"
              checked={values.terms}
              onChange={(e) => set("terms", e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "terms-error" : undefined}
            />
            <span>
              Acepto los <Link href="/ayuda/terminos">términos y condiciones</Link> y la{" "}
              <Link href="/ayuda/privacidad">política de privacidad</Link>.
            </span>
          </label>
          {errors.terms && (
            <span className={styles.fieldError} id="terms-error">
              <Icon name="alert" size={16} />
              {errors.terms}
            </span>
          )}
        </fieldset>

        <div className={styles.actions}>
          <Button type="submit" size="lg" loading={busy} iconStart="lock">
            {busy ? "Pagando" : `Pagar ${formatCLP(total)}`}
          </Button>
        </div>
        {busy && (
          <p className={styles.statusLine} role="status">
            {statusLine}
          </p>
        )}
        {result.status === "webpay" && <WebpayRedirect url={result.url} token={result.token} />}
      </form>
    </StepCard>
  );
}
