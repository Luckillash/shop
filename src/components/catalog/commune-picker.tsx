"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { deliveryCommuneCookie, type DeliveryCommune } from "@/lib/checkout/delivery-commune";
import { communesOf, isCommuneOf, REGIONS } from "@/lib/chile/regions";
import styles from "./product.module.css";

const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.name, label: r.name }));

/** Avisa a DeliveryEstimate que cambió la cookie (document.cookie no tiene eventos) */
export const COMMUNE_CHANGE_EVENT = "comuna-despacho";

// *Cambiar comuna* del bloque de entrega de la Ficha (B35). Guarda la comuna en la cookie desde el
// navegador (no hace falta ir al servidor: la fecha también se calcula aquí).
export function CommunePicker({ current }: { current: DeliveryCommune | null }) {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState(current?.region ?? "");
  const [commune, setCommune] = useState(current?.commune ?? "");
  const [error, setError] = useState<string | undefined>();

  if (!open) {
    return (
      <button type="button" className={styles.linkButton} onClick={() => setOpen(true)}>
        {current ? "Cambiar comuna" : "Elige tu comuna para ver la fecha de entrega"}
      </button>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCommuneOf(region, commune)) {
      setError("Elige la región y la comuna para ver la fecha de entrega.");
      return;
    }
    document.cookie = deliveryCommuneCookie({ region, commune }, location.protocol === "https:");
    setOpen(false);
    setError(undefined);
    window.dispatchEvent(new Event(COMMUNE_CHANGE_EVENT));
  }

  return (
    <form className={styles.communeForm} onSubmit={submit} noValidate aria-label="Comuna de despacho">
      <Select label="Región" autoComplete="address-level1" placeholder="Elige tu región" options={REGION_OPTIONS}
        value={region}
        onChange={(e) => {
          setRegion(e.target.value);
          setCommune("");
        }} />
      <Select label="Comuna" autoComplete="address-level2"
        placeholder={region ? "Elige tu comuna" : "Primero elige la región"}
        options={communesOf(region).map((c) => ({ value: c, label: c }))} value={commune} disabled={!region}
        error={error}
        onChange={(e) => {
          setCommune(e.target.value);
          setError(undefined);
        }} />
      <div className={styles.communeActions}>
        <Button type="submit" size="sm">
          Ver fecha de entrega
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
