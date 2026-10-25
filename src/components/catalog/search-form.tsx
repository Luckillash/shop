import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import fieldStyles from "@/components/ui/field.module.css";
import { cx } from "@/components/ui/cx";
import styles from "./search-form.module.css";

// Buscador grande de Sin resultados, búsqueda vacía y 404. Navega a /buscar?q= sin JS.
export function SearchForm({ defaultValue, id = "buscar-pagina" }: { defaultValue?: string; id?: string }) {
  return (
    <Form action="/buscar" role="search" className={styles.form}>
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <div className={styles.field}>
        <span className={styles.icon}>
          <Icon name="search" />
        </span>
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Busca tazas, mantas, velas…"
          className={cx(fieldStyles.input, styles.input)}
        />
      </div>
      <Button type="submit">Buscar</Button>
    </Form>
  );
}
