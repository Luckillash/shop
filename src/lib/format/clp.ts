const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

// "$12.490": punto de miles, sin decimales y sin espacio tras el signo.
// Los negativos (descuentos) usan el signo menos tipográfico: "−$5.000", como el design system.
export function formatCLP(amount: number): string {
  const rounded = Math.round(amount);
  // Algunas versiones de ICU insertan un espacio no separable después del signo
  const formatted = clp.format(Math.abs(rounded)).replace(/\s/g, "");
  return rounded < 0 ? `−${formatted}` : formatted;
}
