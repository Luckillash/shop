"use client";

import { createContext, startTransition, useActionState, useContext, useState, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import type { AdminActionState } from "@/lib/admin/actions";

// Resultado de la última acción de la administración. Vive en el layout: después de la acción la
// página se vuelve a renderizar (refresh()) y el formulario del paso anterior desaparece, así que el
// aviso no puede quedar en el formulario. Se muestra solo en la página donde se hizo la acción.

type Done = Extract<AdminActionState, { status: "done" }> & { path: string };

const FeedbackContext = createContext<{ done: Done | null; show: (state: Done) => void }>({ done: null, show: () => {} });

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<Done | null>(null);
  return <FeedbackContext.Provider value={{ done, show: setDone }}>{children}</FeedbackContext.Provider>;
}

/** El aviso *Listo: …* de la última acción hecha en esta página */
export function ActionFeedback() {
  const { done } = useContext(FeedbackContext);
  const pathname = usePathname();
  if (!done || done.path !== pathname) return null;
  return <Notice tone={done.tone ?? "success"}>{done.message}</Notice>;
}

const IDLE: AdminActionState = { status: "idle" };

/**
 * useActionState para un formulario de la administración. Si la acción termina bien, el aviso va al
 * layout; los errores se quedan en el formulario. `submit` no vacía los campos al volver con un
 * error (trampa 56).
 */
export function useAdminAction(action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>, onDone?: () => void) {
  const { show } = useContext(FeedbackContext);
  const pathname = usePathname();
  const [state, dispatch, pending] = useActionState(async (prev: AdminActionState, formData: FormData) => {
    const next = await action(prev, formData);
    if (next.status === "done") {
      show({ ...next, path: pathname });
      onDone?.();
    }
    return next;
  }, IDLE);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, submit, pending, error: state.status === "error" ? state : null };
}
