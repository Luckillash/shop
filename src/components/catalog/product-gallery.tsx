"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import styles from "./product.module.css";

type GalleryImage = { id: string; url: string; alt: string };

// Galería de la Ficha: miniaturas verticales (horizontales en móvil) + imagen 4:5 con Badge.
// Filtrar por product_images.variant_id queda pendiente: el seed no tiene fotos por variante.
export function ProductGallery({ images, badge }: { images: GalleryImage[]; badge?: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div className={styles.gallery}>
      {images.length > 1 && (
        <ul className={styles.thumbs} aria-label="Fotos del producto">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                className={cx(styles.thumb, i === index && styles.thumbActive)}
                aria-label={`Ver foto ${i + 1} de ${images.length}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.mainImage}>
        {current ? (
          // Placeholders SVG de placehold.co: next/image queda para las fotos reales (D-015)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={current.alt} />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Icon name="image" size={48} strokeWidth={1.25} />
          </div>
        )}
        {badge && (
          <div className={styles.imageBadge}>
            <Badge tone="sale">{badge}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
