"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BankRow } from "@/lib/payments/labels";
import styles from "./payment.module.css";

const ALL = "todo";

// *Datos para transferir* (template TransferenciaPendiente): cada fila con *Copiar* y un *Copiar
// todos los datos*. Al copiar, el botón dice *Copiado* y se anuncia con role="status".
export function TransferDetails({ rows }: { rows: BankRow[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sin permiso del portapapeles igual se muestra el dato en pantalla
    }
    if (timer.current) clearTimeout(timer.current);
    setCopied(id);
    timer.current = setTimeout(() => setCopied(null), 2500);
  }

  const all = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
  const copiedRow = rows.find((r) => r.id === copied);
  const announcement =
    copied === ALL ? "Copiaste todos los datos." : copiedRow ? `Copiaste ${copiedRow.label.toLowerCase()}.` : "";

  return (
    <section className={styles.card} aria-labelledby="datos-transferir">
      <div className={styles.cardHead}>
        <h2 id="datos-transferir" className={styles.cardTitle}>
          Datos para transferir
        </h2>
        <Button iconStart={copied === ALL ? "check" : undefined} onClick={() => copy(ALL, all)}>
          {copied === ALL ? "Datos copiados" : "Copiar todos los datos"}
        </Button>
      </div>
      <dl className={styles.bank}>
        {rows.map((row) => (
          <div key={row.id} className={styles.bankRow}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            <Button
              variant="ghost"
              size="sm"
              iconStart={copied === row.id ? "check" : undefined}
              aria-label={`${copied === row.id ? "Copiado: " : "Copiar "}${row.label.toLowerCase()}`}
              onClick={() => copy(row.id, row.copy)}
            >
              {copied === row.id ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ))}
      </dl>
      <p className={styles.copyStatus} role="status">
        {announcement}
      </p>
    </section>
  );
}
