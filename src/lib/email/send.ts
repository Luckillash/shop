import "server-only";

// Correo transaccional con Resend (API REST, sin SDK). Sin RESEND_API_KEY no se envía nada y
// queda un aviso en el log: el pedido no depende del correo. Llamar dentro de after() para no
// demorar la respuesta (ni la confirmación de Flow, que debe responder en menos de 15 s).

export type Email = { to: string; subject: string; html: string; text: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[email] Sin RESEND_API_KEY: no se envió "${email.subject}" a ${email.to}`);
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || "Almacén <pedidos@mail.audazia.dev>",
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("[email] Resend respondió", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] No se pudo enviar", error);
    return false;
  }
}
