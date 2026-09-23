// LAYMAN: Automated checks against a throwaway test database — proves re-validation blocks stale approvals, double-submits make one refund, and strangers can't see your orders (run with `npm run test:integration`).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startTestDB, clearDB } from "../helpers/db";

let stop: () => Promise<void>;

beforeAll(async () => {
  stop = await startTestDB();
});
afterAll(async () => {
  await stop();
});
beforeEach(async () => {
  await clearDB();
});

async function seedValid() {
  const { CustomerModel } = await import("@/models/Customer");
  const { OrderModel } = await import("@/models/Order");
  await CustomerModel.create({ customerId: "CUST-T1", name: "Test", email: "t1@example.test", accountStatus: "active" });
  await OrderModel.create({
    orderId: "ORD-T1", customerId: "CUST-T1", productName: "Widget", productCategory: "electronics",
    purchaseDate: new Date(Date.now() - 5 * 86_400_000), price: 10000, currency: "USD",
    orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered",
  });
}

function ctx(customerId: string | null = "CUST-T1") {
  return { verifiedCustomerId: customerId, setVerifiedCustomerId: () => {}, conversationId: "c1", requestId: "r1" };
}

describe("submitRefundRequest integration", () => {
  it("blocks approval if order changed between check and submit", async () => {
    await seedValid();
    const { OrderModel } = await import("@/models/Order");
    const check = await import("@/lib/tools/checkRefundEligibility");
    const submit = await import("@/lib/tools/submitRefundRequest");
    const c1 = await check.run({ orderId: "ORD-T1" }, ctx());
    expect(c1.ok).toBe(true);
    // Order changes (e.g. marked refunded / damaged) before submit.
    await OrderModel.findOneAndUpdate({ orderId: "ORD-T1" }, { $set: { productCondition: "customer_damaged" } });
    const s = await submit.run({ orderId: "ORD-T1", reason: "want refund" }, ctx());
    expect(s.ok).toBe(true);
    const data = (s as { ok: true; data: { refund: { decision: string } } }).data;
    expect(data.refund.decision).toBe("denied");
  });

  it("concurrent double-submit yields exactly one active refund", async () => {
    await seedValid();
    const submit = await import("@/lib/tools/submitRefundRequest");
    const { RefundRequestModel } = await import("@/models/RefundRequest");
    const [a, b] = await Promise.all([
      submit.run({ orderId: "ORD-T1", reason: "r1" }, ctx()),
      submit.run({ orderId: "ORD-T1", reason: "r2" }, ctx()),
    ]);
    expect(a.ok && b.ok).toBe(true);
    const count = await RefundRequestModel.countDocuments({ orderId: "ORD-T1", isActive: true });
    expect(count).toBe(1);
  });

  it("ownership check: other customer's order looks not-found", async () => {
    await seedValid();
    const get = await import("@/lib/tools/getOrderDetails");
    const r = await get.run(
      { orderId: "ORD-T1" },
      { verifiedCustomerId: "CUST-OTHER", setVerifiedCustomerId: () => {}, conversationId: "c", requestId: "r" }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("invalid customer cannot verify (generic failure)", async () => {
    await seedValid();
    const id = await import("@/lib/tools/identifyCustomer");
    const r = await id.run({ customerId: "NOPE", email: "nope@example.test" }, ctx(null));
    expect(r.ok).toBe(false);
  });
});
