import { describe, it, expect } from "vitest";
import { evaluateRefundPolicy } from "@/lib/refund/policy";
import type { OrderDoc } from "@/types";

const base: OrderDoc = {
  orderId: "ORD-T1",
  customerId: "CUST-T1",
  productName: "Widget",
  productCategory: "electronics",
  purchaseDate: new Date(Date.now() - 8 * 86_400_000),
  price: 10000,
  currency: "USD",
  orderStatus: "delivered",
  paymentStatus: "paid",
  refundStatus: "none",
  productCondition: "as_delivered",
};

const now = new Date();

function run(over: Partial<OrderDoc> = {}, extra: Record<string, unknown> = {}) {
  return evaluateRefundPolicy({
    order: { ...base, ...over },
    verifiedCustomerId: "CUST-T1",
    customerAccountStatus: "active",
    hasActiveRefund: false,
    now,
    ...extra,
  } as never);
}

describe("policy v1", () => {
  it("approves a valid order", () => {
    expect(run().decision).toBe("approve");
  });
  it("denies expired (62 days)", () => {
    const r = run({ purchaseDate: new Date(now.getTime() - 62 * 86_400_000) });
    expect(r.decision).toBe("deny");
    expect(r.reasonCode).toBe("REFUND_WINDOW_EXPIRED");
  });
  it("day 30 passes, day 31 denied", () => {
    expect(run({ purchaseDate: new Date(now.getTime() - 30 * 86_400_000) }).decision).toBe("approve");
    expect(run({ purchaseDate: new Date(now.getTime() - 31 * 86_400_000) }).decision).toBe("deny");
  });
  it("denies already refunded / duplicate active", () => {
    expect(run({ refundStatus: "refunded" }).decision).toBe("deny");
    const r = evaluateRefundPolicy({ order: base, verifiedCustomerId: "CUST-T1", customerAccountStatus: "active", hasActiveRefund: true, now });
    expect(r.decision).toBe("deny");
  });
  it("denies nonexistent order and wrong owner (same code)", () => {
    const a = evaluateRefundPolicy({ order: null, verifiedCustomerId: "CUST-T1", customerAccountStatus: "active", hasActiveRefund: false, now });
    const b = evaluateRefundPolicy({ order: base, verifiedCustomerId: "CUST-OTHER", customerAccountStatus: "active", hasActiveRefund: false, now });
    expect(a.decision).toBe("deny");
    expect(b.decision).toBe("deny");
    expect(a.reasonCode).toBe(b.reasonCode);
  });
  it("denies not delivered / unpaid / non-refundable / customer_damaged", () => {
    expect(run({ orderStatus: "shipped" }).reasonCode).toBe("NOT_DELIVERED");
    expect(run({ paymentStatus: "pending" }).reasonCode).toBe("PAYMENT_NOT_COMPLETED");
    expect(run({ productCategory: "digital" }).reasonCode).toBe("CATEGORY_NOT_REFUNDABLE");
    expect(run({ productCategory: "final_sale" }).reasonCode).toBe("CATEGORY_NOT_REFUNDABLE");
    expect(run({ productCondition: "customer_damaged" }).reasonCode).toBe("CONDITION_NOT_ACCEPTABLE");
  });
  it("defective gets 90-day window (day 50 approve)", () => {
    const r = run({ productCondition: "defective", purchaseDate: new Date(now.getTime() - 50 * 86_400_000) });
    expect(r.decision).toBe("approve");
    const r2 = run({ productCondition: "defective", purchaseDate: new Date(now.getTime() - 91 * 86_400_000) });
    expect(r2.decision).toBe("deny");
  });
  it("escalates high value and suspended", () => {
    expect(run({ price: 149900 }).decision).toBe("escalate");
    const r = evaluateRefundPolicy({ order: base, verifiedCustomerId: "CUST-T1", customerAccountStatus: "suspended", hasActiveRefund: false, now });
    expect(r.decision).toBe("escalate");
  });
  it("deny beats escalate (expired + high value = deny)", () => {
    const r = run({ price: 149900, purchaseDate: new Date(now.getTime() - 62 * 86_400_000) });
    expect(r.decision).toBe("deny");
  });
});
