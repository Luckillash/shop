// Variantes de la Ficha: agrupa product_variants.attributes por clave para VariantPicker
// y resuelve qué variante corresponde a la selección.

export type VariantInfo = {
  id: string;
  sku: string;
  /** "Arena", "Grande" o "Única" */
  name: string;
  /** {"color":"Arena"} · claves en español */
  attributes: Record<string, string>;
  /** Precio efectivo en CLP: coalesce(variant.price, product.base_price) */
  price: number;
};

/** Stock por id de variante. null = todavía no se conoce (se carga aparte) */
export type StockMap = Record<string, number>;

/** Umbral de "stock bajo" (B19, propuesta ≤ 3) */
export const LOW_STOCK_THRESHOLD = 3;

const ATTRIBUTE_LABELS: Record<string, string> = {
  color: "Color",
  talla: "Tamaño",
  aroma: "Aroma",
  capacidad: "Capacidad",
};

// Muestras de color: la BD guarda solo el nombre (sin código de color, ver B33)
const COLOR_SWATCHES: Record<string, string> = {
  Arena: "#d9c7a7",
  Crudo: "#efe8d8",
  Grafito: "#3d3c39",
  Oliva: "#76763f",
  Terracota: "#b4532a",
  "Verde pino": "#2f5d46",
};

export type AttributeGroup = {
  key: string;
  label: string;
  type: "color" | "size";
  options: { value: string; label: string; color?: string }[];
};

export function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

// Una opción por valor distinto, en el orden de las variantes. Si la variante tiene un solo
// atributo, la etiqueta es su nombre ("talla": "L" → "Grande").
export function attributeGroups(variants: VariantInfo[]): AttributeGroup[] {
  const groups = new Map<string, AttributeGroup>();

  for (const variant of variants) {
    const entries = Object.entries(variant.attributes);
    for (const [key, value] of entries) {
      let group = groups.get(key);
      if (!group) {
        group = { key, label: attributeLabel(key), type: key === "color" ? "color" : "size", options: [] };
        groups.set(key, group);
      }
      if (group.options.some((o) => o.value === value)) continue;
      group.options.push({
        value,
        label: entries.length === 1 ? variant.name : value,
        color: key === "color" ? (COLOR_SWATCHES[value] ?? "var(--surface-sunken)") : undefined,
      });
    }
  }

  return [...groups.values()];
}

export function matchesSelection(variant: VariantInfo, selection: Record<string, string>): boolean {
  return Object.entries(selection).every(([key, value]) => variant.attributes[key] === value);
}

export function findVariant(variants: VariantInfo[], selection: Record<string, string>): VariantInfo | undefined {
  return variants.find((v) => matchesSelection(v, selection));
}

// Una opción está disponible si alguna variante con ese valor (y el resto de la selección) tiene stock
export function isOptionAvailable(
  variants: VariantInfo[],
  stock: StockMap,
  selection: Record<string, string>,
  key: string,
  value: string,
): boolean {
  const wanted = { ...selection, [key]: value };
  return variants.some((v) => matchesSelection(v, wanted) && (stock[v.id] ?? 0) > 0);
}

// La primera con stock; si todas están agotadas (o el stock no se conoce), la primera
export function defaultVariant(variants: VariantInfo[], stock: StockMap | null): VariantInfo | undefined {
  return (stock && variants.find((v) => (stock[v.id] ?? 0) > 0)) || variants[0];
}

// "Quedan 2 unidades de este color" · "Queda 1 unidad" · null si no es stock bajo
export function lowStockMessage(units: number, attributeKey?: string): string | null {
  if (units <= 0 || units > LOW_STOCK_THRESHOLD) return null;
  const base = units === 1 ? "Queda 1 unidad" : `Quedan ${units} unidades`;
  if (attributeKey === "color") return `${base} de este color`;
  if (attributeKey === "talla") return `${base} de este tamaño`;
  if (attributeKey === "aroma") return `${base} de este aroma`;
  return base;
}

/**
 * Línea de variante del CartItem: "Color: Arena" · "Tamaño: Grande" · null sin opciones.
 * Con un solo atributo usa el nombre de la variante, como VariantPicker ("talla": "L" → "Grande").
 */
export function variantDescription(variant: Pick<VariantInfo, "name" | "attributes">): string | null {
  const entries = Object.entries(variant.attributes);
  if (entries.length === 0) return null;
  if (entries.length === 1) return `${attributeLabel(entries[0][0])}: ${variant.name}`;
  return entries.map(([key, value]) => `${attributeLabel(key)}: ${value}`).join(" · ");
}

/** Nombre para el carro: "Taza de gres esmaltado · Arena" (sin "Única") */
export function cartItemName(productName: string, variant: VariantInfo): string {
  return Object.keys(variant.attributes).length === 0 ? productName : `${productName} · ${variant.name}`;
}
