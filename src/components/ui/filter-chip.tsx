"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./icon";
import styles from "./filter-chip.module.css";

export type FilterChipProps = {
  children: ReactNode;
  selected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  /** Cantidad de resultados con este filtro */
  count?: number;
};

// Filtros que se combinan. Para opciones excluyentes usa radios o un Select.
export function FilterChip({ children, selected, defaultSelected = false, onChange, count }: FilterChipProps) {
  const [internal, setInternal] = useState(defaultSelected);
  const on = selected ?? internal;

  function toggle() {
    if (selected === undefined) setInternal(!on);
    onChange?.(!on);
  }

  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={toggle}>
      {on && <Icon name="check" size={16} />}
      <span>{children}</span>
      {count !== undefined && <span className={styles.count}>({count})</span>}
    </button>
  );
}
