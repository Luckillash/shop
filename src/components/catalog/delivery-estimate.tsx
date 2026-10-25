"use client";

import { useSyncExternalStore } from "react";
import { readDeliveryCommune } from "@/lib/checkout/delivery-commune";
import { deliveryEstimate, shippingCost } from "@/lib/checkout/shipping";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import catalog from "./catalog.module.css";
import { COMMUNE_CHANGE_EVENT, CommunePicker } from "./commune-picker";
import { ShippingByZone } from "./delivery-info";
import styles from "./product.module.css";

function subscribe(onChange: () => void) {
  window.addEventListener(COMMUNE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(COMMUNE_CHANGE_EVENT, onChange);
}

// La cookie y la hora se leen juntas, solo en el navegador. Ojo: nada de `new Date()` en el render,
// ni siquiera en useState: al prerenderizar, Next corta ahí el shell estático y al retomar la
// página el árbol no coincide (*Couldn't find all resumable slots*, trampa 62). El objeto se
// guarda para que useSyncExternalStore reciba el mismo snapshot mientras la cookie no cambie.
let snapshot: { cookies: string; now: Date } | null = null;

function getSnapshot() {
  const cookies = document.cookie;
  if (snapshot?.cookies !== cookies) snapshot = { cookies, now: new Date() };
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

// Fecha de entrega concreta en la Ficha (B35): *Llega el martes 27 de octubre a Providencia*.
// Se calcula en el navegador con la cookie de la comuna, así la Ficha sigue estática. En el
// servidor y durante la hidratación se muestran los plazos por zona (sin diferencias, trampa 23).
export function DeliveryEstimate() {
  const browser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (browser === null) return <ShippingByZone />;
  const { cookies, now } = browser;
  const current = readDeliveryCommune(cookies);
  if (!current) return <ShippingByZone action={<CommunePicker current={null} />} />;

  const estimate = deliveryEstimate("standard", current.region, now);
  const cost = shippingCost("standard", current.region, 0);
  return (
    <>
      <p className={styles.deliveryTitle}>
        {estimate?.label} a {current.commune}
      </p>
      <p className={catalog.muted}>
        Despacho a domicilio {cost == null ? "" : formatCLP(cost)} · gratis sobre {formatCLP(STORE.freeShippingThreshold)}.
      </p>
      <CommunePicker current={current} />
    </>
  );
}
