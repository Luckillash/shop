"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type AddressActionResult,
  type AddressState,
} from "@/lib/account/actions";
import {
  ADDRESS_FIELDS,
  addressFieldError,
  addressLines,
  addressTitle,
  addressValues,
  EMPTY_ADDRESS,
  MAX_ADDRESSES,
  type AddressField,
  type AddressRow,
  type AddressValues,
} from "@/lib/account/addresses";
import type { FieldErrors } from "@/lib/checkout/validation";
import { communesOf, REGIONS } from "@/lib/chile/regions";
import { formatChileanMobile } from "@/lib/format/phone";
import styles from "./account.module.css";

// Template Direcciones / DireccionesMovil: tarjetas con la principal primero y, debajo, el
// formulario para agregar o editar (los campos del checkout). Las acciones hacen refresh() y la
// lista llega de nuevo del servidor; el aviso del resultado queda aquí arriba.

const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.name, label: r.name }));
const FORM_ID = "nueva";

type Feedback = { tone: "success" | "danger"; message: string } | null;

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const [editing, setEditing] = useState<AddressRow | null>(null);
  // Cambia para volver a montar el formulario vacío después de guardar o cancelar
  const [formKey, setFormKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const full = addresses.length >= MAX_ADDRESSES;

  function openForm(address: AddressRow | null) {
    setEditing(address);
    setFormKey((k) => k + 1);
    setFeedback(null);
    // El formulario está debajo de la lista: se lleva a la vista y se enfoca su primer campo
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  function done(message: string) {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFeedback({ tone: "success", message });
  }

  return (
    <>
      <div className={styles.headingRow}>
        <div className={styles.heading}>
          <h1 id="direcciones" className={styles.title}>
            Direcciones
          </h1>
          <p className={styles.lead}>La principal se completa sola en el checkout.</p>
        </div>
        {addresses.length > 0 && !full && (
          <Button variant="secondary" iconStart="plus" onClick={() => openForm(null)}>
            Agregar dirección
          </Button>
        )}
      </div>

      {feedback && <Notice tone={feedback.tone}>{feedback.message}</Notice>}

      {addresses.length === 0 ? (
        // Estado vacío sin diseño: texto propuesto (pendientes-del-dueno-fase-7.md, T12)
        <p className={styles.lead}>
          Todavía no tienes direcciones guardadas. Agrega una y la completamos por ti en el checkout.
        </p>
      ) : (
        <ul className={styles.addresses}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => openForm(address)}
              onResult={(result) => {
                if (result.ok && editing?.id === address.id) setEditing(null);
                setFeedback({ tone: result.ok ? "success" : "danger", message: result.message });
              }}
            />
          ))}
        </ul>
      )}

      <div ref={formRef} id={FORM_ID}>
        {full && !editing ? (
          <Notice tone="info">Puedes guardar hasta {MAX_ADDRESSES} direcciones. Elimina una para agregar otra.</Notice>
        ) : (
          <AddressForm
            key={formKey}
            address={editing}
            canSkipDefault={addresses.some((a) => a.is_default && a.id !== editing?.id)}
            onSaved={done}
            onCancel={() => {
              setEditing(null);
              setFormKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </>
  );
}

function AddressCard({
  address,
  onEdit,
  onResult,
}: {
  address: AddressRow;
  onEdit: () => void;
  onResult: (result: AddressActionResult) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startAction] = useTransition();
  const [busy, setBusy] = useState<"default" | "delete" | null>(null);
  const title = addressTitle(address);

  function run(kind: "default" | "delete") {
    setBusy(kind);
    startAction(async () => {
      const result = kind === "default" ? await setDefaultAddress(address.id) : await deleteAddress(address.id);
      setBusy(null);
      setConfirming(false);
      onResult(result);
    });
  }

  return (
    <li className={styles.address}>
      <div className={styles.addressTop}>
        <h2 className={styles.addressTitle}>{title}</h2>
        {address.is_default && (
          <Badge tone="new" icon="check">
            Principal
          </Badge>
        )}
      </div>
      <p className={styles.addressText}>
        {addressLines(address).map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
      <div className={styles.addressActions}>
        {confirming ? (
          <>
            {/* Confirmación en la tarjeta (sin diseño, propuesta) */}
            <p className={styles.confirmText} role="status">
              ¿Eliminar {title}? Tus pedidos no cambian.
            </p>
            <Button variant="secondary" size="sm" iconStart="trash" loading={busy === "delete"} onClick={() => run("delete")}>
              {busy === "delete" ? "Eliminando" : "Sí, eliminar"}
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" disabled={pending} onClick={onEdit} aria-label={`Editar ${title}`}>
              Editar
            </Button>
            {!address.is_default && (
              <Button variant="ghost" size="sm" loading={busy === "default"} onClick={() => run("default")}>
                {busy === "default" ? "Guardando" : "Usar como principal"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              iconStart="trash"
              disabled={pending}
              onClick={() => setConfirming(true)}
              aria-label={`Eliminar ${title}`}
            >
              Eliminar
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

const IDLE: AddressState = { status: "idle" };

function AddressForm({
  address,
  canSkipDefault,
  onSaved,
  onCancel,
}: {
  address: AddressRow | null;
  /** false si esta será la única principal posible (la primera dirección): la casilla queda marcada */
  canSkipDefault: boolean;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const editingDefault = address?.is_default ?? false;
  const [values, setValues] = useState<AddressValues>(() =>
    address ? addressValues(address) : { ...EMPTY_ADDRESS, isDefault: !canSkipDefault },
  );
  const [errors, setErrors] = useState<FieldErrors<AddressField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const focusField = useRef<AddressField | null>(null);
  const [, action, pending] = useActionState(async (prev: AddressState, formData: FormData) => {
    const next = await saveAddress(prev, formData);
    if (next.status === "saved") {
      onSaved(next.message);
      return next;
    }
    if (next.status === "error") {
      setErrors(next.errors);
      setMessage(next.message ?? null);
      focusField.current = ADDRESS_FIELDS.find((field) => next.errors[field]) ?? null;
    }
    return next;
  }, IDLE);

  // El primer campo con error recibe el foco cuando el fieldset deja de estar deshabilitado
  useEffect(() => {
    if (pending || !focusField.current) return;
    document.getElementById(`address-${focusField.current}`)?.focus();
    focusField.current = null;
  }, [pending]);

  // La casilla no se puede desmarcar en la principal ni en la primera dirección
  const defaultLocked = editingDefault || !canSkipDefault;

  function set<K extends keyof AddressValues>(key: K, value: AddressValues[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "region" && value !== v.region) next.commune = "";
      return next;
    });
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function blur(field: AddressField) {
    if (!values[field]) return; // un campo vacío se marca al enviar
    setErrors((e) => ({ ...e, [field]: addressFieldError(field, values) ?? undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "isDefault") {
        if (value || defaultLocked) formData.set("isDefault", "on");
      } else formData.set(key, String(value));
    }
    if (address) formData.set("id", address.id);
    startTransition(() => action(formData));
  }

  const title = address ? `Editar ${addressTitle(address)}` : "Agregar dirección";

  return (
    <form className={styles.box} onSubmit={submit} noValidate aria-labelledby="address-form-title" aria-busy={pending || undefined}>
      <h2 id="address-form-title" className={styles.boxTitle}>
        {title}
      </h2>
      {message && <Notice tone="danger">{message}</Notice>}
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className="sr-only">{title}</legend>
        <div className={styles.fieldGrid}>
          <TextField id="address-label" label="Nombre de la dirección" placeholder="Casa, Oficina" maxLength={40}
            hint="Para que la reconozcas en el checkout." value={values.label} error={errors.label}
            onChange={(e) => set("label", e.target.value)} onBlur={() => blur("label")} />
          <TextField id="address-phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="+56 9 1234 5678" value={values.phone} error={errors.phone}
            onChange={(e) => set("phone", e.target.value)}
            onBlur={() => {
              blur("phone");
              setValues((v) => ({ ...v, phone: v.phone && formatChileanMobile(v.phone) }));
            }} />
          <TextField id="address-firstName" label="Nombre" autoComplete="given-name" value={values.firstName}
            error={errors.firstName} onChange={(e) => set("firstName", e.target.value)} onBlur={() => blur("firstName")} />
          <TextField id="address-lastName" label="Apellido" autoComplete="family-name" value={values.lastName}
            error={errors.lastName} onChange={(e) => set("lastName", e.target.value)} onBlur={() => blur("lastName")} />
          <Select id="address-region" label="Región" autoComplete="address-level1" placeholder="Elige tu región"
            options={REGION_OPTIONS} value={values.region} error={errors.region}
            onChange={(e) => set("region", e.target.value)} />
          <Select id="address-commune" label="Comuna" autoComplete="address-level2"
            placeholder={values.region ? "Elige la comuna" : "Primero elige la región"}
            options={communesOf(values.region).map((c) => ({ value: c, label: c }))}
            value={values.commune} error={errors.commune} disabled={!values.region}
            onChange={(e) => set("commune", e.target.value)} />
          <TextField id="address-street" label="Calle y número" autoComplete="address-line1" placeholder="Av. Providencia 1234"
            value={values.street} error={errors.street} onChange={(e) => set("street", e.target.value)} onBlur={() => blur("street")} />
          <TextField id="address-apartment" label="Depto., casa u oficina (opcional)" autoComplete="address-line2"
            placeholder="Depto. 502" value={values.apartment} onChange={(e) => set("apartment", e.target.value)} />
        </div>
      </fieldset>
      <label className={styles.check} aria-disabled={defaultLocked || undefined}>
        <input
          type="checkbox"
          checked={values.isDefault || defaultLocked}
          disabled={pending || defaultLocked}
          onChange={(e) => set("isDefault", e.target.checked)}
        />
        <span>
          Usar como dirección principal
          {defaultLocked && (
            <span className={styles.checkHint}>
              {editingDefault ? "Para cambiarla, elige otra como principal." : "Tu primera dirección es la principal."}
            </span>
          )}
        </span>
      </label>
      <div className={styles.formActions}>
        <Button type="submit" loading={pending}>
          {pending ? "Guardando" : "Guardar dirección"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
