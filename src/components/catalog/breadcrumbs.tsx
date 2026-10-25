import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import styles from "./breadcrumbs.module.css";

export type Crumb = { label: string; href?: string };

// Migas de pan: el último elemento es la página actual (sin enlace)
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Migas de pan" className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className={styles.item}>
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last && <Icon name="chevronRight" size={16} className={styles.separator} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
