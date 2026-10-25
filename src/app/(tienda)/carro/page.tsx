import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import catalog from "@/components/catalog/catalog.module.css";
import { DeliveryInfo } from "@/components/catalog/delivery-info";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getFeaturedProducts, getNewProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Tu carro", robots: { index: false } };

// Templates Carro y Carro vacío. El carro está en el cliente (Zustand + localStorage), así que la
// página es estática: el servidor solo aporta los recomendados (cacheados) y el bloque de entrega.
export default async function CartPage() {
  const [featured, newest] = await Promise.all([getFeaturedProducts(4), getNewProducts(4)]);

  return (
    <main className={catalog.main}>
      <CartView
        delivery={<DeliveryInfo />}
        recommendations={
          <section className={catalog.section} aria-labelledby="te-podria-gustar">
            <h2 id="te-podria-gustar" className={catalog.sectionTitle}>
              Te podría gustar
            </h2>
            <ProductGrid items={featured} />
          </section>
        }
        newArrivals={
          <section className={catalog.section} aria-labelledby="novedades">
            <h2 id="novedades" className={catalog.sectionTitle}>
              Novedades
            </h2>
            <ProductGrid items={newest} />
          </section>
        }
      />
    </main>
  );
}
