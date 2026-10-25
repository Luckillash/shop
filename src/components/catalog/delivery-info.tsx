import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatCLP } from "@/lib/format/clp";
import { STORE } from "@/lib/store";
import catalog from "./catalog.module.css";
import styles from "./product.module.css";

type DeliveryInfoProps = {
  /**
   * Contenido del ítem de despacho. La Ficha pasa la fecha concreta para la comuna del visitante
   * (DeliveryEstimate, B35); sin él se muestran los plazos por zona (el Carro, que es estático).
   */
  shipping?: ReactNode;
};

// Bloque de entrega de la Ficha y del Carro (05-dominio/reglas-de-negocio.md#despacho)
export function DeliveryInfo({ shipping }: DeliveryInfoProps) {
  return (
    <ul className={styles.delivery}>
      <li>
        <Icon name="truck" />
        <div>{shipping ?? <ShippingByZone />}</div>
      </li>
      <li>
        <Icon name="returns" />
        <div>
          <p className={styles.deliveryTitle}>30 días para cambios</p>
          <p className={catalog.muted}>Si no es lo que esperabas, lo cambias o lo devuelves.</p>
        </div>
      </li>
    </ul>
  );
}

/**
 * Plazos por zona, sin comuna (y respaldo mientras se calcula la fecha concreta). `action` va
 * fuera del párrafo: el selector de comuna se abre como un <form>.
 */
export function ShippingByZone({ action }: { action?: ReactNode }) {
  return (
    <>
      <p className={styles.deliveryTitle}>Despacho gratis sobre {formatCLP(STORE.freeShippingThreshold)}</p>
      <p className={catalog.muted}>
        Región Metropolitana en 1 a 2 días hábiles · Regiones en 3 a 5 días hábiles.
        {!action && (
          <>
            {" "}
            <Link href="/ayuda/despacho" className={catalog.link}>
              Revisa los plazos para tu comuna
            </Link>
          </>
        )}
      </p>
      {action}
    </>
  );
}
