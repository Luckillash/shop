"use client";

import { useState, useTransition } from "react";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import type { CatalogItem } from "@/lib/catalog/mappers";
import { setWishlisted } from "@/lib/wishlist/actions";
import { savedCountLabel } from "@/lib/wishlist/state";
import { useWishlistStore } from "@/store/wishlist-store";
import styles from "./account.module.css";

// Template Favoritos / FavoritosMovil (7.5): grilla de ProductCard con el corazón marcado. Al
// tocarlo se quita de la lista (y de wishlist_items) con *Deshacer* en el aviso (propuesta).

type Removed = { item: CatalogItem; index: number } | null;

export function FavoritesGrid({ initialItems }: { initialItems: CatalogItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [removed, setRemoved] = useState<Removed>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startAction] = useTransition();

  function remove(item: CatalogItem) {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((list) => list.filter((i) => i.id !== item.id));
    setRemoved({ item, index });
    setError(null);
    startAction(async () => {
      const result = await setWishlisted(item.id, false).catch(() => ({ status: "error" as const }));
      if (result.status === "ok") {
        useWishlistStore.getState().sync(item.id, false);
        return;
      }
      // No se pudo: vuelve a la lista
      setItems((list) => insertAt(list, item, index));
      setRemoved(null);
      setError(result.status === "signin" ? "Tu sesión se cerró. Ingresa de nuevo para cambiar tus favoritos." : "No pudimos quitarlo de tus favoritos. Vuelve a intentarlo.");
    });
  }

  function undo() {
    if (!removed) return;
    const { item, index } = removed;
    setItems((list) => insertAt(list, item, index));
    setRemoved(null);
    startAction(async () => {
      const result = await setWishlisted(item.id, true).catch(() => ({ status: "error" as const }));
      if (result.status !== "ok") {
        setItems((list) => list.filter((i) => i.id !== item.id));
        setError("No pudimos volver a guardarlo. Vuelve a intentarlo desde el producto.");
      } else {
        useWishlistStore.getState().sync(item.id, true);
      }
    });
  }

  return (
    <>
      <div className={styles.heading}>
        <h1 id="favoritos" className={styles.title}>
          Favoritos
        </h1>
        {/* El artboard agrega *Te avisamos por aquí si alguno baja de precio o se agota*: no existe ese aviso */}
        {items.length > 0 && <p className={styles.lead}>{savedCountLabel(items.length)}</p>}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {removed && (
        <Notice
          tone="success"
          action={
            <Button variant="ghost" size="sm" onClick={undo}>
              Deshacer
            </Button>
          }
        >
          Quitamos {removed.item.name} de tus favoritos.
        </Notice>
      )}

      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyMark}>
            <Icon name="heart" size={24} />
          </span>
          <h2 className={styles.emptyTitle}>Todavía no guardas favoritos</h2>
          <p className={styles.lead}>
            Toca el corazón en cualquier producto para guardarlo aquí y verlo en todos tus dispositivos.
          </p>
          <Button href="/">Explorar la tienda</Button>
        </div>
      ) : (
        <ul className={styles.favorites}>
          {items.map((item) => (
            <li key={item.id} className={styles.favorite}>
              <CatalogProductCard item={item} onUnfavorite={() => remove(item)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function insertAt(list: CatalogItem[], item: CatalogItem, index: number): CatalogItem[] {
  if (list.some((i) => i.id === item.id)) return list;
  const next = [...list];
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}
