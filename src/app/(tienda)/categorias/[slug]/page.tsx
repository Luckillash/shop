import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import catalog from "@/components/catalog/catalog.module.css";
import { ListingBody, ListingHeader, ListingSkeleton } from "@/components/catalog/listing";
import { getCategories, getCategoryBySlug } from "@/lib/catalog/queries";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Página no encontrada" };
  return { title: category.name, description: category.description ?? undefined };
}

// params se lee dentro de <Suspense>: así existe un App Shell para categorías nuevas
export default function CategoryPage({ params, searchParams }: PageProps<"/categorias/[slug]">) {
  return (
    <main className={catalog.main}>
      <Suspense fallback={<ListingSkeleton />}>
        <CategoryListing params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CategoryListing({ params, searchParams }: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <>
      <ListingHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: category.name }]}
        title={category.name}
        description={category.description}
      />
      <Suspense fallback={<ListingSkeleton />}>
        <ListingBody
          scope={{ kind: "category", slug }}
          searchParams={searchParams}
          pathname={`/categorias/${slug}`}
          emptyText="Todavía no hay productos en esta categoría."
        />
      </Suspense>
    </>
  );
}
