import { Suspense } from "react";
import type { Metadata } from "next";
import catalog from "@/components/catalog/catalog.module.css";
import { ListingBody, ListingHeader, ListingSkeleton } from "@/components/catalog/listing";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo último que llegó a Almacén: cerámica, textiles, velas y cocina.",
};

// Todo el catálogo, ordenado por fecha de llegada por defecto
export default function NewArrivalsPage({ searchParams }: PageProps<"/novedades">) {
  return (
    <main className={catalog.main}>
      <ListingHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Novedades" }]}
        title="Novedades"
        description="Lo último que llegó de nuestros talleres."
      />
      <Suspense fallback={<ListingSkeleton />}>
        <ListingBody scope={{ kind: "all" }} searchParams={searchParams} pathname="/novedades" defaultSort="novedades" />
      </Suspense>
    </main>
  );
}
