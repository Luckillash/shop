import { Suspense } from "react";
import type { Metadata } from "next";
import catalog from "@/components/catalog/catalog.module.css";
import { ListingBody, ListingHeader, ListingSkeleton } from "@/components/catalog/listing";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos con precio rebajado en Almacén.",
};

// Productos con compare_at_price (precio normal tachado)
export default function SalePage({ searchParams }: PageProps<"/ofertas">) {
  return (
    <main className={catalog.main}>
      <ListingHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Ofertas" }]}
        title="Ofertas"
        description="Piezas con precio rebajado mientras haya stock."
      />
      <Suspense fallback={<ListingSkeleton />}>
        <ListingBody
          scope={{ kind: "sale" }}
          searchParams={searchParams}
          pathname="/ofertas"
          emptyText="Ahora no hay productos en oferta."
        />
      </Suspense>
    </main>
  );
}
