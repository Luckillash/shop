"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// false en el servidor y durante la hidratación; true después. El carro vive en localStorage:
// hasta entonces no se sabe si está vacío (mismo patrón que CartLink).
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
