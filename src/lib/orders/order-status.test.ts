import { describe, expect, it } from "vitest";
import { METROPOLITAN_REGION } from "@/lib/chile/regions";
import { Constants } from "@/types/database";
import {
  adminNextStep,
  adminStatusBadge,
  canTransition,
  customerStatusBadge,
  estimatedDelivery,
  isCancellable,
  isCancelReason,
  trackingProgress,
} from "./order-status";

const RM = { region: METROPOLITAN_REGION, city: "Providencia" };

describe("estados del pedido", () => {
  it("badges del cliente según el diseño (MisPedidos, FlujoPostcompra)", () => {
    expect(customerStatusBadge("pending")).toEqual({ label: "Pago pendiente", tone: "warning", icon: "alert" });
    expect(customerStatusBadge("paid").label).toBe("En preparación");
    expect(customerStatusBadge("processing").label).toBe("En preparación");
    expect(customerStatusBadge("shipped")).toEqual({ label: "En camino", tone: "new", icon: "truck" });
    expect(customerStatusBadge("delivered")).toEqual({ label: "Entregado", tone: "success", icon: "check" });
    expect(customerStatusBadge("cancelled")).toEqual({ label: "Anulado", tone: "danger", icon: "close" });
    expect(customerStatusBadge("refunded")).toEqual({ label: "Reembolsado", tone: "neutral", icon: "returns" });
  });

  it("todos los estados de la BD tienen badge", () => {
    for (const status of Constants.public.Enums.order_status) {
      expect(customerStatusBadge(status).label).toBeTruthy();
      expect(adminStatusBadge(status, "webpay").label).toBeTruthy();
    }
  });

  it("badges de la administración", () => {
    expect(adminStatusBadge("pending", "transfer").label).toBe("Transferencia por confirmar");
    expect(adminStatusBadge("pending", "webpay").label).toBe("Pago pendiente");
    expect(adminStatusBadge("paid", "webpay").label).toBe("Por preparar");
    expect(adminStatusBadge("processing", "webpay").label).toBe("En preparación");
    expect(adminStatusBadge("shipped", "flow").label).toBe("En camino");
  });

  it("transiciones permitidas para la administración", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("paid", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("cancelled", "refunded")).toBe(true);
    // Saltos y retrocesos
    expect(canTransition("paid", "shipped")).toBe(false);
    expect(canTransition("delivered", "pending")).toBe(false);
    expect(canTransition("shipped", "processing")).toBe(false);
    expect(canTransition("refunded", "cancelled")).toBe(false);
    expect(canTransition("pending", "refunded")).toBe(false);
  });

  it("se anula lo que cancel_order acepta: pending, paid y processing", () => {
    const cancellable = Constants.public.Enums.order_status.filter(isCancellable);
    expect(cancellable).toEqual(["pending", "paid", "processing"]);
  });

  it("siguiente paso de AdminPedido", () => {
    expect(adminNextStep("pending", "transfer")).toBe("confirm_transfer");
    expect(adminNextStep("pending", "webpay")).toBeNull();
    expect(adminNextStep("paid", "webpay")).toBe("start_preparing");
    expect(adminNextStep("processing", "flow")).toBe("mark_shipped");
    expect(adminNextStep("shipped", "transfer")).toBe("mark_delivered");
    expect(adminNextStep("delivered", "webpay")).toBeNull();
    expect(adminNextStep("cancelled", "webpay")).toBeNull();
  });

  it("pasos del seguimiento", () => {
    expect(trackingProgress("pending")).toBe(0);
    expect(trackingProgress("paid")).toBe(1);
    expect(trackingProgress("processing")).toBe(2);
    expect(trackingProgress("shipped")).toBe(3);
    expect(trackingProgress("delivered")).toBe(4);
    expect(trackingProgress("cancelled")).toBe(0);
  });

  it("motivos de anulación", () => {
    expect(["vencio", "tienda", "cliente"].every(isCancelReason)).toBe(true);
    expect(isCancelReason("otro")).toBe(false);
    expect(isCancelReason(null)).toBe(false);
  });
});

describe("fecha de entrega estimada (B25)", () => {
  // Domingo 25-10-2026 10:12 en Santiago (UTC−3)
  const placed = "2026-10-25T13:12:00Z";

  it("se calcula desde el pago, con los plazos por zona", () => {
    // Pagado el lunes 26: RM = 2 días hábiles → miércoles 28
    const order = { shipping_method: "standard", shipping_address: RM, placed_at: placed, paid_at: "2026-10-26T12:00:00Z" };
    expect(estimatedDelivery(order)).toEqual({ date: "2026-10-28", label: "Llega el miércoles 28 de octubre" });
  });

  it("sin pago usa placed_at; regiones son 5 días hábiles", () => {
    const order = { shipping_method: "standard", shipping_address: { region: "Valparaíso" }, placed_at: placed, paid_at: null };
    expect(estimatedDelivery(order)?.label).toBe("Llega el viernes 30 de octubre");
  });

  it("express sin el *mañana* relativo del checkout", () => {
    // Lunes 26 a las 10:00 (antes de las 14:00) → martes 27
    const order = { shipping_method: "express", shipping_address: RM, placed_at: placed, paid_at: "2026-10-26T13:00:00Z" };
    expect(estimatedDelivery(order)?.label).toBe("Llega el martes 27 de octubre");
  });

  it("retiro en tienda", () => {
    const order = { shipping_method: "pickup", shipping_address: {}, placed_at: placed, paid_at: "2026-10-26T13:00:00Z" };
    expect(estimatedDelivery(order)?.label).toMatch(/^Disponible desde el /);
  });

  it("sin región no hay fecha", () => {
    const order = { shipping_method: "standard", shipping_address: {}, placed_at: placed, paid_at: null };
    expect(estimatedDelivery(order)).toBeNull();
  });
});
