import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "@/components/account/account.module.css";
import { NewsletterToggle, PasswordForm, ProfileForm } from "@/components/account/profile-forms";
import { cx } from "@/components/ui/cx";
import { profileValues } from "@/lib/account/profile";
import { getMyProfile } from "@/lib/account/queries";
import { getSessionUser } from "@/lib/auth/session";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Datos personales", robots: { index: false } };

// Template DatosPersonales / DatosPersonalesMovil (7.5, D-030). Requiere una sesión no anónima (D-026).
export default function PersonalDataPage() {
  return (
    <section aria-labelledby="datos-personales" className={cx(styles.section, styles.narrow)}>
      <div className={styles.heading}>
        <h1 id="datos-personales" className={styles.title}>
          Datos personales
        </h1>
        <p className={styles.lead}>Los usamos para completar el checkout y para avisarte de tus pedidos.</p>
      </div>
      <Suspense fallback={<div className={styles.skeleton} aria-busy="true" aria-label="Cargando tus datos" />}>
        <PersonalData />
      </Suspense>
    </section>
  );
}

async function PersonalData() {
  const user = await getSessionUser();
  if (!user || user.isAnonymous) redirect("/ingresar?volver=/cuenta/datos");
  const profile = await getMyProfile(user.id);

  return (
    <>
      <ProfileForm initial={profileValues(profile)} email={user.email ?? ""} contactEmail={STORE.contactEmail} />
      <PasswordForm />
      <NewsletterToggle initialOptedIn={profile?.newsletter_opt_in_at != null} />
      <p className={styles.note}>
        ¿Quieres eliminar tu cuenta? Escríbenos a <a href={`mailto:${STORE.contactEmail}`}>{STORE.contactEmail}</a> y la
        borramos junto con tus datos; tus pedidos se conservan para la boleta.
      </p>
    </>
  );
}
