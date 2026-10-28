"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { VariantPicker } from "@/components/ui/variant-picker";
import {
  attributeGroups,
  cartItemName,
  defaultVariant,
  findVariant,
  isOptionAvailable,
  lowStockMessage,
  type StockMap,
  variantDescription,
  type VariantInfo,
} from "@/lib/catalog/variants";
import { MAX_QUANTITY } from "@/lib/cart/totals";
import { useCartStore } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";
import styles from "./product.module.css";
import { useWishlist } from "./use-wishlist";

type ProductPurchaseProps = {
  productId: string;
  slug: string;
  productName: string;
  /** Primera imagen de la galería: la miniatura del carro */
  image: string | null;
  compareAt: number | null;
  variants: VariantInfo[];
  /** null mientras el stock se carga (fallback del <Suspense>) */
  stock: StockMap | null;
};

// Isla de compra de la Ficha: precio, variantes, stock, cantidad, Agregar al carro y favorito.
// Agregar al carro abre el drawer (template Carro · drawer).
export function ProductPurchase({
  productId,
  slug,
  productName,
  image,
  compareAt,
  variants,
  stock,
}: ProductPurchaseProps) {
  const groups = attributeGroups(variants);
  const [selection, setSelection] = useState<Record<string, string>>(
    () => defaultVariant(variants, stock)?.attributes ?? {},
  );
  const [quantity, setQuantity] = useState(1);
  const wishlist = useWishlist(productId);
  const addItem = useCartStore((s) => s.addItem);
  const showDrawer = useCartUi((s) => s.show);

  const variant = findVariant(variants, selection) ?? variants[0];
  const units = stock && variant ? (stock[variant.id] ?? 0) : null;
  const soldOut = units === 0;
  const lowStock = units != null ? lowStockMessage(units, groups[0]?.key) : null;

  function select(key: string, value: string) {
    const next = { ...selection, [key]: value };
    // Si la combinación no existe, se queda con la primera variante que tenga el valor elegido
    const match = findVariant(variants, next) ?? variants.find((v) => v.attributes[key] === value);
    setSelection(match ? match.attributes : next);
    setQuantity(1);
  }

  function add() {
    if (!variant || units == null || soldOut) return;
    addItem(
      {
        variantId: variant.id,
        productId,
        slug,
        name: productName,
        variantName: variantDescription(variant),
        image,
        unitPrice: variant.price,
        compareAt: compareAt != null && compareAt > variant.price ? compareAt : null,
        maxQuantity: Math.min(units, MAX_QUANTITY),
      },
      quantity,
    );
    showDrawer(cartItemName(productName, variant));
  }

  if (!variant) {
    return <p className={styles.muted}>Este producto no está disponible por ahora.</p>;
  }

  return (
    <div className={styles.purchase}>
      <Price amount={variant.price} compareAt={compareAt} size="lg" />

      {groups.map((group) => (
        <VariantPicker
          key={group.key}
          label={group.label}
          type={group.type}
          value={selection[group.key]}
          onChange={(value) => select(group.key, value)}
          options={group.options.map((o) => ({
            ...o,
            disabled: stock ? !isOptionAvailable(variants, stock, selection, group.key, o.value) : false,
          }))}
        />
      ))}

      {soldOut && (
        <Badge tone="danger" icon="alert">
          Sin stock en esta opción
        </Badge>
      )}
      {lowStock && (
        <Badge tone="warning" icon="alert">
          {lowStock}
        </Badge>
      )}

      <div className={styles.buyRow}>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, Math.min(units ?? 1, 99))}
          label={`Cantidad de ${productName}`}
        />
        <Button
          size="lg"
          iconStart="cart"
          onClick={add}
          disabled={units == null || soldOut}
          className={styles.addButton}
        >
          {units == null ? "Revisando stock" : soldOut ? "Sin stock" : "Agregar al carro"}
        </Button>
        {/* Favoritos (7.5): se leen después de hidratar; sin cuenta, lleva a Ingresar (B23) */}
        <IconButton
          icon="heart"
          label={wishlist.wishlisted ? "Quitar de favoritos" : "Guardar en favoritos"}
          pressed={wishlist.wishlisted}
          onClick={() => void wishlist.toggle()}
        />
      </div>
    </div>
  );
}
