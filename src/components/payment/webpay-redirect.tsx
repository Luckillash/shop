"use client";

import { useEffect, useRef } from "react";

// Webpay espera un formulario POST a `url` con token_ws; redirect() haría un GET (trampa 8).
// Sin iframe: el formulario de Webpay puede no desplegarse dentro de uno.
export function WebpayRedirect({ url, token }: { url: string; token: string }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.submit();
  }, []);
  return (
    <form ref={form} method="post" action={url} hidden>
      <input type="hidden" name="token_ws" value={token} />
    </form>
  );
}
