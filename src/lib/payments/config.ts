import "server-only";

// Variables de las pasarelas (07-referencia/variables-de-entorno.md). Se leen al usarlas, no al
// importar el módulo, para que el build no exija las credenciales.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver .env.example)`);
  return value;
}

/** URL pública del sitio, sin / final: return_url de Webpay, urlReturn y urlConfirmation de Flow */
export function siteUrl(): string {
  return required("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
}

const WEBPAY_HOSTS = {
  integration: "https://webpay3gint.transbank.cl",
  production: "https://webpay3g.transbank.cl",
} as const;

export function webpayConfig() {
  const env = process.env.WEBPAY_ENV === "production" ? "production" : "integration";
  return {
    baseUrl: `${WEBPAY_HOSTS[env]}/rswebpaytransaction/api/webpay/v1.2`,
    commerceCode: required("WEBPAY_COMMERCE_CODE"),
    apiKey: required("WEBPAY_API_KEY"),
  };
}

export function flowConfig() {
  return {
    baseUrl: (process.env.FLOW_API_URL?.trim() || "https://sandbox.flow.cl/api").replace(/\/+$/, ""),
    apiKey: required("FLOW_API_KEY"),
    secretKey: required("FLOW_SECRET_KEY"),
  };
}

/** Datos para transferir (ficticios hasta producción): desde el servidor, nunca en el componente */
export function bankDetails() {
  return {
    bank: required("BANK_NAME"),
    accountType: required("BANK_ACCOUNT_TYPE"),
    accountNumber: required("BANK_ACCOUNT_NUMBER"),
    holder: required("BANK_ACCOUNT_HOLDER"),
    rut: required("BANK_ACCOUNT_RUT"),
    email: required("BANK_ACCOUNT_EMAIL"),
  };
}

export type BankDetails = ReturnType<typeof bankDetails>;
