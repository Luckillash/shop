"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import type { ShippingDefaults } from "@/lib/checkout/defaults";
import { saveShipping, type ShippingSelection, type ShippingState } from "@/lib/checkout/actions";
import {
  deliveryEstimate,
  isExpressAvailable,
  shippingCost,
  shippingMethodLabel,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/lib/checkout/shipping";
import {
  SHIPPING_FIELDS,
  shippingFieldError,
  type FieldErrors,
  type ShippingField,
} from "@/lib/checkout/validation";
import { communesOf, REGIONS } from "@/lib/chile/regions";
import { formatCLP } from "@/lib/format/clp";
import { formatChileanMobile } from "@/lib/format/phone";
import { formatRut } from "@/lib/format/rut";
import { STORE } from "@/lib/store";
import { ErrorSummary, OptionGroup, StepCard } from "./parts";
import styles from "./checkout.module.css";

const LABELS: Record<ShippingField, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  rut: "RUT",
  phone: "Teléfono",
  region: "Región",
  commune: "Comuna",
  street: "Calle y número",
  method: "Tipo de despacho",
};

const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.name, label: r.name }));

type ShippingStepProps = {
  state: "current" | "done" | "pending";
  defaults: ShippingDefaults;
  selection: ShippingSelection | null;
  /** Subtotal después del cupón: el despacho gratis se mide contra él (D-011) */
  base: number;
  onSaved: (selection: ShippingSelection) => void;
  onEdit: () => void;
  editDisabled?: boolean;
};

const IDLE: ShippingState = { status: "idle" };

function priceLabel(cost: number | null) {
  if (cost == null) return "Por calcular";
  return cost === 0 ? <span className={styles.free}>Gratis</span> : formatCLP(cost);
}

// Paso 2: datos de quien recibe, dirección y tipo de despacho. Guarda la dirección; no crea el pedido
export function ShippingStep({ state, defaults, selection, base, onSaved, onEdit, editDisabled }: ShippingStepProps) {
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState<FieldErrors<ShippingField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [now] = useState(() => new Date());
  const [, action, pending] = useActionState(async (prev: ShippingState, formData: FormData) => {
    const next = await saveShipping(prev, formData);
    setErrors(next.status === "error" ? next.errors : {});
    setMessage(next.status === "error" ? (next.message ?? null) : null);
    setShowSummary(next.status === "error" && Object.keys(next.errors).length > 0);
    if (next.status === "saved") {
      setValues((v) => ({ ...v, addressId: next.selection.addressId ?? v.addressId }));
      onSaved(next.selection);
    }
    return next;
  }, IDLE);

  if (state === "pending") {
    return <StepCard step="shipping" number={2} state="pending" />;
  }

  if (state === "done" && selection) {
    return (
      <StepCard step="shipping" number={2} state="done" onEdit={onEdit} editDisabled={editDisabled}>
        <ShippingDone selection={selection} base={base} now={now} />
      </StepCard>
    );
  }

  const pickup = values.method === "pickup";
  const region = values.region || null;

  function set<K extends keyof ShippingDefaults>(key: K, value: ShippingDefaults[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Al cambiar de región, la comuna anterior ya no sirve, y el express solo existe en la RM
      if (key === "region" && value !== v.region) {
        next.commune = "";
        if (next.method === "express" && !isExpressAvailable(String(value) || null)) next.method = "";
      }
      return next;
    });
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function blur(field: ShippingField) {
    const value = values[field as keyof ShippingDefaults];
    if (!value) return; // un campo vacío se marca al enviar, no al pasar por él
    setErrors((e) => ({ ...e, [field]: shippingFieldError(field, values) ?? undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value ?? "");
    startTransition(() => action(formData));
  }

  const methodOptions = SHIPPING_METHODS.map((method) => {
    if (method === "express" && !isExpressAvailable(region)) {
      return { value: method, title: shippingMethodLabel(method), detail: "Solo en la Región Metropolitana", disabled: true };
    }
    const estimate = deliveryEstimate(method, region, now);
    const detail =
      method === "pickup"
        ? `${estimate?.label} · ${STORE.pickup.address} · ${STORE.pickup.hours}`
        : (estimate?.label ?? "Elige tu comuna para ver la fecha de entrega");
    return { value: method, title: shippingMethodLabel(method), detail, price: priceLabel(shippingCost(method, region, base)) };
  });

  return (
    <StepCard step="shipping" number={2} state="current">
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={pending || undefined}>
        {showSummary && <ErrorSummary errors={errors} order={SHIPPING_FIELDS} labels={LABELS} action="continuar" />}
        {message && <Notice tone="danger">{message}</Notice>}

        <fieldset className={styles.fieldset} disabled={pending}>
          <legend className="sr-only">Quién recibe</legend>
          <div className={styles.fields}>
            <TextField id="firstName" label="Nombre" autoComplete="given-name" value={values.firstName}
              error={errors.firstName} onChange={(e) => set("firstName", e.target.value)} onBlur={() => blur("firstName")} />
            <TextField id="lastName" label="Apellido" autoComplete="family-name" value={values.lastName}
              error={errors.lastName} onChange={(e) => set("lastName", e.target.value)} onBlur={() => blur("lastName")} />
            <TextField id="rut" label="RUT" inputMode="numeric" autoComplete="off" value={values.rut}
              hint="Lo usamos para emitir tu boleta." error={errors.rut}
              onChange={(e) => set("rut", e.target.value)}
              onBlur={() => {
                blur("rut");
                setValues((v) => ({ ...v, rut: v.rut && formatRut(v.rut) }));
              }} />
            <TextField id="phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" value={values.phone}
              placeholder="+56 9 1234 5678" hint="Solo para coordinar la entrega." error={errors.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => {
                blur("phone");
                setValues((v) => ({ ...v, phone: v.phone && formatChileanMobile(v.phone) }));
              }} />
          </div>
        </fieldset>

        <OptionGroup
          name="method"
          legend="Tipo de despacho"
          options={methodOptions}
          value={values.method || null}
          onChange={(v) => set("method", v as ShippingMethod)}
          error={errors.method}
          disabled={pending}
        />

        {!pickup && (
          <fieldset className={styles.fieldset} disabled={pending}>
            <legend className={styles.legend}>Dirección de despacho</legend>
            <div className={styles.fields}>
              <Select id="region" label="Región" autoComplete="address-level1" placeholder="Elige tu región"
                options={REGION_OPTIONS} value={values.region} error={errors.region}
                onChange={(e) => set("region", e.target.value)} />
              <Select id="commune" label="Comuna" autoComplete="address-level2"
                placeholder={values.region ? "Elige tu comuna" : "Primero elige la región"}
                options={communesOf(values.region).map((c) => ({ value: c, label: c }))}
                value={values.commune} error={errors.commune} disabled={!values.region}
                onChange={(e) => set("commune", e.target.value)} />
              <TextField id="street" label="Calle y número" autoComplete="address-line1" value={values.street}
                error={errors.street} onChange={(e) => set("street", e.target.value)} onBlur={() => blur("street")} />
              <TextField id="apartment" label="Depto., casa u oficina (opcional)" autoComplete="address-line2"
                value={values.apartment} onChange={(e) => set("apartment", e.target.value)} />
            </div>
          </fieldset>
        )}

        <div className={styles.actions}>
          <Button type="submit" size="lg" loading={pending} iconEnd="chevronRight">
            {pending ? "Guardando" : "Continuar al pago"}
          </Button>
        </div>
      </form>
    </StepCard>
  );
}

/** Resumen del despacho guardado (paso 2 listo y encabezado del paso Pago) */
export function ShippingDone({ selection, base, now }: { selection: ShippingSelection; base: number; now: Date }) {
  const region = selection.address?.region ?? null;
  const cost = shippingCost(selection.method, region, base);
  const estimate = deliveryEstimate(selection.method, region, now);
  const where = selection.address
    ? `${selection.address.street}${selection.address.apartment ? `, ${selection.address.apartment}` : ""}, ${selection.address.commune}`
    : STORE.pickup.address;
  return (
    <p className={styles.done}>
      <strong>{shippingMethodLabel(selection.method)}</strong>
      {estimate && ` · ${estimate.label}`} · {cost == null ? "Por calcular" : cost === 0 ? "Gratis" : formatCLP(cost)}
      <br />
      {selection.firstName} {selection.lastName} · {where}
    </p>
  );
}
