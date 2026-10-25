import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/catalog/breadcrumbs";
import catalog from "@/components/catalog/catalog.module.css";
import { DeliveryEstimate } from "@/components/catalog/delivery-estimate";
import { DeliveryInfo } from "@/components/catalog/delivery-info";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductPurchase } from "@/components/catalog/product-purchase";
import styles from "@/components/catalog/product.module.css";
import { Rating } from "@/components/ui/rating";
import { productDetails } from "@/lib/catalog/mappers";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
  getReviews,
  getVariantStock,
  type ProductDetail,
} from "@/lib/catalog/queries";
import { formatDeliveryDay } from "@/lib/format/dates";

// El catálogo es chico: se prerenderizan todas las fichas. Las nuevas usan el App Shell
// y se completan después de la primera visita (ISR con Cache Components).
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Página no encontrada" };
  const cover = product.images[0];
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: cover ? [{ url: cover.url, alt: cover.alt }] : undefined,
    },
  };
}

export default function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  return (
    <main className={catalog.main}>
      <Suspense fallback={<div className={styles.skeleton} aria-hidden="true" />}>
        <ProductView params={params} />
      </Suspense>
    </main>
  );
}

async function ProductView({ params }: Pick<PageProps<"/productos/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // El rating viene de las reseñas publicadas (mismo cálculo que product_catalog)
  const reviews = await getReviews(product.id);
  const rating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const onSale = product.compareAt != null && product.compareAt > minPrice;
  const details = productDetails(product.metadata);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          ...(product.category
            ? [{ label: product.category.name, href: `/categorias/${product.category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className={styles.top}>
        <ProductGallery images={product.images} badge={onSale ? "Oferta" : undefined} />

        <div className={styles.buy}>
          {product.brand && <p className={catalog.overline}>{product.brand}</p>}
          <h1 className={styles.name}>{product.name}</h1>
          {rating != null && (
            <a href="#opiniones" className={styles.ratingLink}>
              <Rating value={Math.round(rating * 10) / 10} count={reviews.length} />
            </a>
          )}

          <Suspense fallback={<Purchase product={product} stock={null} />}>
            <PurchaseWithStock product={product} />
          </Suspense>

          {/* Fecha para la comuna del visitante: se calcula en el navegador (B35) */}
          <DeliveryInfo shipping={<DeliveryEstimate />} />
        </div>
      </div>

      <div className={styles.info}>
        <section className={styles.infoBlock} aria-labelledby="descripcion">
          <h2 id="descripcion" className={catalog.sectionTitle}>
            Descripción
          </h2>
          {product.description && <p className={styles.text}>{product.description}</p>}
          {product.metadata.origen && <p className={styles.text}>{product.metadata.origen}.</p>}
        </section>
        <section className={styles.infoBlock} aria-labelledby="detalles">
          <h2 id="detalles" className={catalog.sectionTitle}>
            Detalles
          </h2>
          <dl className={styles.details}>
            {details.map((d) => (
              <div key={d.label} className={styles.detailRow}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
            <div className={styles.detailRow}>
              <dt>SKU</dt>
              <dd>
                {product.variants.map((v) => (
                  <span key={v.id} className={styles.sku}>
                    {product.variants.length > 1 && `${v.name}: `}
                    <code>{v.sku}</code>
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={catalog.section} aria-labelledby="opiniones-titulo" id="opiniones">
        <h2 id="opiniones-titulo" className={catalog.sectionTitle}>
          Opiniones
        </h2>
        {reviews.length === 0 ? (
          <p className={catalog.muted}>
            Todavía no hay opiniones de este producto. Las publican quienes ya lo compraron.
          </p>
        ) : (
          <ul className={styles.reviews}>
            {reviews.map((r) => (
              <li key={r.id} className={styles.review}>
                <Rating value={r.rating} showValue={false} />
                {r.title && <p className={styles.reviewTitle}>{r.title}</p>}
                {r.body && <p className={styles.text}>{r.body}</p>}
                <p className={catalog.muted}>{formatDeliveryDay(new Date(r.created_at))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {product.category && <Related categoryId={product.category.id} productId={product.id} />}
    </>
  );
}

function Purchase({ product, stock }: { product: ProductDetail; stock: Record<string, number> | null }) {
  return (
    <ProductPurchase
      productId={product.id}
      slug={product.slug}
      productName={product.name}
      image={product.images[0]?.url ?? null}
      compareAt={product.compareAt}
      variants={product.variants}
      stock={stock}
    />
  );
}

// El stock va aparte, con vida corta (cacheLife "seconds"), para no dejar la ficha entera dinámica
async function PurchaseWithStock({ product }: { product: ProductDetail }) {
  const stock = await getVariantStock(product.id);
  return <Purchase product={product} stock={stock} />;
}

async function Related({ categoryId, productId }: { categoryId: string; productId: string }) {
  const related = await getRelatedProducts(categoryId, productId);
  if (related.length === 0) return null;

  return (
    <section className={catalog.section} aria-labelledby="relacionados">
      <h2 id="relacionados" className={catalog.sectionTitle}>
        Te podría gustar
      </h2>
      <ProductGrid items={related} />
    </section>
  );
}
