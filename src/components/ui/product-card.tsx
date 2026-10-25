"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "./badge";
import { Button } from "./button";
import { cx } from "./cx";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { Price } from "./price";
import { Rating } from "./rating";
import styles from "./product-card.module.css";

export type ProductCardProps = {
  title: string;
  /** Marca o taller, en overline */
  brand?: string;
  href: string;
  /** Foto 4:5. Sin ella se muestra un placeholder neutro */
  image?: string | null;
  imageAlt?: string;
  price: number;
  compareAt?: number | null;
  rating?: number | null;
  reviewCount?: number;
  /** Insignia de marketing ("Nuevo"). Los descuentos salen de compareAt, no de aquí */
  badge?: string;
  badgeTone?: "new" | "neutral" | "success" | "warning";
  soldOut?: boolean;
  wishlisted?: boolean;
  onWishlistChange?: (wishlisted: boolean) => void;
  onAdd?: () => void;
  adding?: boolean;
  addLabel?: string;
  className?: string;
};

// Toda la tarjeta enlaza a la ficha. El botón es secondary; agotado: insignia, imagen atenuada y "Sin stock".
export function ProductCard({
  title,
  brand,
  href,
  image,
  imageAlt,
  price,
  compareAt,
  rating,
  reviewCount,
  badge,
  badgeTone = "new",
  soldOut = false,
  wishlisted = false,
  onWishlistChange,
  onAdd,
  adding,
  addLabel = "Agregar al carro",
  className,
}: ProductCardProps) {
  const [internalFav, setInternalFav] = useState(wishlisted);
  const controlled = onWishlistChange !== undefined;
  const fav = controlled ? wishlisted : internalFav;

  function toggleFav() {
    if (controlled) onWishlistChange(!fav);
    else setInternalFav(!fav);
  }

  return (
    <article className={cx(styles.card, soldOut && styles.soldOut, className)}>
      <div className={styles.media}>
        {image ? (
          // Las imágenes vienen de Supabase Storage o de placeholders externos; la optimización
          // con next/image (remotePatterns) se define en la fase 3 junto con el catálogo real.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={imageAlt ?? ""} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <Icon name="image" size={32} strokeWidth={1.25} />
          </div>
        )}
        {(soldOut || badge) && (
          <div className={styles.badges}>
            {soldOut ? <Badge>Agotado</Badge> : <Badge tone={badgeTone}>{badge}</Badge>}
          </div>
        )}
      </div>
      <div className={styles.fav}>
        <IconButton
          icon="heart"
          size="sm"
          label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
          pressed={fav}
          onClick={toggleFav}
        />
      </div>
      <div className={styles.body}>
        {brand && <span className={styles.brand}>{brand}</span>}
        <Link className={styles.title} href={href}>
          {title}
        </Link>
        {rating != null && reviewCount ? <Rating value={rating} count={reviewCount} /> : null}
        <Price amount={price} compareAt={compareAt} />
        <div className={styles.foot}>
          {soldOut ? (
            <Button variant="secondary" block disabled>
              Sin stock
            </Button>
          ) : (
            <Button variant="secondary" block iconStart="cart" onClick={onAdd} loading={adding}>
              {adding ? "Agregando" : addLabel}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
