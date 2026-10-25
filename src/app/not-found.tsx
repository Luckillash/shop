import type { Metadata } from "next";
import { NotFoundContent } from "@/components/catalog/not-found-content";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = { title: "Página no encontrada" };

// URL que no coincide con ninguna ruta: queda fuera del layout (tienda), así que lleva su header y footer
export default function NotFound() {
  return (
    <>
      <Header />
      <NotFoundContent />
      <Footer />
    </>
  );
}
