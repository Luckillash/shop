import { formatCLP } from "@/lib/format/clp";

// Cupón del carro: normalización del código y mensajes según el hint de validate_coupon.

export type CouponFailure = "invalid" | "exhausted" | "used" | "min_order" | "rate_limited" | "error";

export type AppliedCoupon = { code: string; discount: number; description: string | null };

export type CouponResult = { ok: true; coupon: AppliedCoupon } | { ok: false; reason: CouponFailure; message: string };

const CODE_PATTERN = /^[A-Z0-9_-]{2,40}$/;

/** "  bienvenida10 " → "BIENVENIDA10" · null si no puede ser un código */
export function normalizeCouponCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function couponFailureReason(hint: string | null | undefined): CouponFailure {
  switch (hint) {
    case "invalid":
    case "exhausted":
    case "used":
    case "min_order":
      return hint;
    default:
      return "error";
  }
}

// Mensajes de place_order adaptados al tono del diseño ("carro", tú, la solución)
export function couponMessage(reason: CouponFailure, minOrder?: number): string {
  switch (reason) {
    case "invalid":
      return "Este cupón no es válido o ya venció. Revisa cómo lo escribiste.";
    case "exhausted":
      return "Este cupón ya alcanzó su límite de usos.";
    case "used":
      return "Ya usaste este cupón en otra compra.";
    case "min_order":
      return minOrder
        ? `Este cupón es para compras desde ${formatCLP(minOrder)}. Agrega productos para usarlo.`
        : "Tu compra no llega al mínimo de este cupón.";
    case "rate_limited":
      return "Hiciste muchos intentos. Espera unos minutos y vuelve a intentarlo.";
    case "error":
      return "No pudimos revisar el cupón. Vuelve a intentarlo.";
  }
}

/** Solo los códigos que no existen cuentan para el rate limiting (son los de fuerza bruta) */
export function countsAsFailedAttempt(reason: CouponFailure): boolean {
  return reason === "invalid";
}
