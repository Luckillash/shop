import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesGrid } from "@/components/account/favorites-grid";
import styles from "@/components/account/account.module.css";
import { getMyWishlistIds } from "@/lib/account/queries";
import { getSessionUser } from "@/lib/auth/session";
import { getProductsByIds } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false } };

// Template Favoritos / FavoritosMovil (7.5). Los ids salen de wishlist_items con la sesión; los
// productos, del catálogo cacheado (tag products). Requiere una sesión no anónima (D-026, B23).
export default function FavoritesPage() {
  return (
    <section aria-labelledby="favoritos" className={styles.section}>
      <Suspense fallback={<FavoritesSkeleton />}>
        <Favorites />
      </Suspense>
    </section>
  );
}

function FavoritesSkeleton() {
  return (
    <>
      <div className={styles.heading}>
        <h1 id="favoritos" className={styles.title}>
          Favoritos
        </h1>
      </div>
      <div className={styles.skeleton} aria-busy="true" aria-label="Cargando tus favoritos" />
    </>
  );
}

async function Favorites() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect("/ingresar?volver=/cuenta/favoritos");
  const items = await getProductsByIds(await getMyWishlistIds(user.id));
  return <FavoritesGrid initialItems={items} />;
}
