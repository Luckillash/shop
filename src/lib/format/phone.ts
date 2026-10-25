// Celular chileno: 9 dígitos que empiezan con 9, con o sin el prefijo 56

function nationalDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("56") ? digits.slice(2) : digits;
}

export function isValidChileanMobile(input: string): boolean {
  return /^9\d{8}$/.test(nationalDigits(input));
}

// Formato para guardar (E.164): "+56912345678". Devuelve null si no es válido
export function normalizeChileanMobile(input: string): string | null {
  const digits = nationalDigits(input);
  return /^9\d{8}$/.test(digits) ? `+56${digits}` : null;
}

// Formato para mostrar: "+56 9 1234 5678". Si no es válido, lo devuelve tal cual
export function formatChileanMobile(input: string): string {
  const digits = nationalDigits(input);
  if (!/^9\d{8}$/.test(digits)) return input;
  return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
}
