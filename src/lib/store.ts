// Datos de la tienda que muestran el header, el footer y las reglas de despacho.
// Vienen del diseño y están marcados como ajustables: confirmarlos antes de producción.
export const STORE = {
  name: "Almacén",
  legalName: "Almacén SpA",
  rut: "76.543.210-3",
  contactEmail: "hola@almacen.cl",
  /** Despacho gratis sobre este subtotal (CLP) */
  freeShippingThreshold: 39990,
  /**
   * Retiro en tienda (D-014). ⚠️ Datos ficticios (2026-10-24) hasta que el dueño dé los reales.
   * place_order guarda la misma dirección en orders.shipping_address (ecommerce_schema.sql §11):
   * si cambia, hay que cambiar las dos.
   */
  pickup: {
    name: "Almacén Providencia",
    street: "Av. Manuel Montt 1530",
    unit: "Local 4",
    commune: "Providencia",
    /** "Av. Manuel Montt 1530, Local 4, Providencia" */
    address: "Av. Manuel Montt 1530, Local 4, Providencia",
    /** Días hábiles después del pago para que el pedido esté listo */
    readyInBusinessDays: 1,
    hours: "Lunes a viernes de 10:00 a 19:00 y sábados de 10:00 a 14:00",
    instructions: "Retira con tu RUT y el número de pedido.",
  },
} as const;
