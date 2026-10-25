"use client";

import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/ui/product-card";
import type { CatalogItem } from "@/lib/catalog/mappers";
import { MAX_QUANTITY } from "@/lib/cart/totals";
import { useCartStore } from "@/store/cart-store";
import { useCartUi } from "@/store/cart-ui-store";

// ProductCard con datos del catálogo. Con una sola variante agrega directo al carro y abre
// el drawer; con varias, el botón lleva a la Ficha para elegir la opción (D-017).
export function CatalogProductCard({ item }: { item: CatalogItem }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const showDrawer = useCartUi((s) => s.show);
  const href = `/productos/${item.slug}`;

  function handleAdd() {
    if (!item.singleVariantId) {
      router.push(href);
      return;
    }
    // Con una sola variante, el stock del producto es el de la variante. La línea de variante
    // (si tuviera atributos) la completa refreshCart al abrir /carro.
    addItem({
      variantId: item.singleVariantId,
      productId: item.id,
      slug: item.slug,
      name: item.name,
      variantName: null,
      image: item.image,
      unitPrice: item.price,
      compareAt: item.compareAt,
      maxQuantity: Math.min(item.stock, MAX_QUANTITY),
    });
    showDrawer(item.name);
  }

  return (
    <ProductCard
      title={item.name}
      brand={item.brand ?? undefined}
      href={href}
      image={item.image}
      imageAlt={item.name}
      price={item.price}
      compareAt={item.compareAt}
      rating={item.rating}
      reviewCount={item.reviewCount}
      soldOut={item.soldOut}
      onAdd={handleAdd}
      addLabel={item.singleVariantId ? "Agregar al carro" : "Ver opciones"}
    />
  );
}
