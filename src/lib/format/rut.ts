// Deja solo dígitos y K: "12.345.678-k" → "12345678K"
export function cleanRut(input: string): string {
  return input.replace(/[^0-9kK]/g, "").toUpperCase();
}

// Valida el dígito verificador con módulo 11
export function isValidRut(input: string): boolean {
  const rut = cleanRut(input);
  if (rut.length < 2) return false;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return dv === expected;
}

// Formato para guardar: "12345678-5"
export function normalizeRut(input: string): string {
  const rut = cleanRut(input);
  if (rut.length < 2) return rut;
  return `${rut.slice(0, -1)}-${rut.slice(-1)}`;
}

// Formato para mostrar: "12.345.678-5"
export function formatRut(input: string): string {
  const rut = cleanRut(input);
  if (rut.length < 2) return rut;
  const body = rut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${rut.slice(-1)}`;
}
