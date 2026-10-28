import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { ActionFeedbackProvider } from "@/components/admin/action-feedback";
import { AdminHeader } from "@/components/admin/admin-header";
import styles from "@/components/admin/admin.module.css";
import { getAlertCounts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Administración" },
  robots: { index: false, follow: false },
};

// Administración (D-029): sin el header ni el footer de la tienda. El acceso se valida aquí, en cada
// página (requireAdmin) y en cada Server Action (getAdminUser); el proxy da el código HTTP real en la
// carga directa (redirect a Ingresar o 404). Los fallbacks son neutros: nada del shell estático dice
// que /admin existe.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Suspense fallback={<div className={styles.headerSkeleton} />}>
        <Header />
      </Suspense>
      <ActionFeedbackProvider>{children}</ActionFeedbackProvider>
    </div>
  );
}

async function Header() {
  await requireAdmin("/admin");
  const { open } = await getAlertCounts();
  return <AdminHeader openAlerts={open} />;
}
