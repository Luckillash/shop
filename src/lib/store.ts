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
   * Retiro en tienda (D-014). Datos reales del dueño (2026-10-25).
   * place_order guarda la misma dirección en orders.shipping_address (ecommerce_schema.sql §11):
   * si cambia, hay que cambiar las dos.
   */
  pickup: {
    name: "Local Tajamar",
    street: "Tajamar 223",
    unit: "Departamento 302",
    commune: "Las Condes",
    /** "Tajamar 223, Departamento 302, Las Condes" */
    address: "Tajamar 223, Departamento 302, Las Condes",
    /** Días hábiles después del pago para que el pedido esté listo */
    readyInBusinessDays: 1,
    hours: "Lunes a viernes de 10:00 a 18:00 y sábados de 10:00 a 14:00",
    instructions: "Retira con tu RUT y número de pedido.",
  },
} as const;
