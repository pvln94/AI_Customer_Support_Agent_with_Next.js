import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { CustomerModel } from "@/models/Customer";
import { RefundRequestModel } from "@/models/RefundRequest";
import { submitRefundSchema } from "@/lib/validation/schemas";
import { evaluateRefundPolicy, POLICY_VERSION } from "@/lib/refund/policy";
import type { ToolContext } from "./context";
import type { ToolResult, OrderDoc } from "@/types";
import { shouldSimulateFailure } from "./simulate";

export const name = "submitRefundRequest";
export const description =
  "Submit a refund request. The policy is re-validated from fresh DB data. Refunds are SIMULATED, no money moves.";
export const parameters = {
  type: "object",
  properties: {
    orderId: { type: "string" },
    reason: { type: "string", description: "customer reason" },
  },
  required: ["orderId", "reason"],
};

function newId() {
  return `RR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
}

export async function run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (shouldSimulateFailure(name))
    return { ok: false, error: { code: "TRANSIENT", message: "Temporary submit failure.", retryable: true }, customerFacingSummary: "Submit hiccup — retrying." };
  const parsed = submitRefundSchema.safeParse(args);
  if (!parsed.success)
    return { ok: false, error: { code: "INVALID_ARGS", message: "orderId and reason required.", retryable: false }, customerFacingSummary: "Please tell me the order ID and reason." };
  if (!ctx.verifiedCustomerId)
    return { ok: false, error: { code: "NOT_VERIFIED", message: "Verify customer first.", retryable: false }, customerFacingSummary: "Please share your customer ID and email first." };
  await connectDB();
  const { orderId, reason } = parsed.data;
  const customerId = ctx.verifiedCustomerId;

  // Idempotency: a retry returns the existing request, never a second refund.
  const existing = await RefundRequestModel.findOne({ orderId }).sort({ createdAt: -1 }).lean();
  if (existing && (existing as { isActive?: boolean }).isActive) {
    const d = existing as unknown as { decision: string; status: string; reasonCode: string; decisionReason: string };
    return {
      ok: true,
      data: { refund: { orderId, decision: d.decision, status: d.status, reasonCode: d.reasonCode, reason: d.decisionReason }, duplicate: true },
      customerFacingSummary: "A refund request already exists for this order.",
    };
  }

  // Fresh read + re-validation (blocks approval if order changed between check and submit).
  const order = await OrderModel.findOne({ orderId, customerId }).lean();
  if (!order)
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found.", retryable: false }, customerFacingSummary: "I couldn't find that order for your account." };
  const customer = await CustomerModel.findOne({ customerId }).lean();
  const active = await RefundRequestModel.findOne({ orderId, isActive: true }).lean();
  const policy = evaluateRefundPolicy({
    order: order as unknown as OrderDoc,
    verifiedCustomerId: customerId,
    customerAccountStatus: (customer?.accountStatus as "active" | "suspended") ?? "active",
    hasActiveRefund: !!active,
  });

  if (policy.decision === "deny") {
    const row = await RefundRequestModel.create({
      refundRequestId: newId(),
      customerId,
      orderId,
      reason,
      eligibilityStatus: policy.reasonCode,
      decision: "denied",
      reasonCode: policy.reasonCode,
      decisionReason: policy.reason,
      status: "denied",
      isActive: false,
    });
    return {
      ok: true,
      data: { refund: { orderId, decision: "denied", status: row.status, reasonCode: policy.reasonCode, reason: policy.reason }, policyVersion: POLICY_VERSION },
      customerFacingSummary: `Refund denied: ${policy.reason}`,
    };
  }

  if (policy.decision === "escalate") {
    await OrderModel.findOneAndUpdate(
      { orderId, customerId, refundStatus: "none" },
      { $set: { refundStatus: "pending_review" } }
    );
    const row = await RefundRequestModel.create({
      refundRequestId: newId(),
      customerId,
      orderId,
      reason,
      eligibilityStatus: policy.reasonCode,
      decision: "escalated",
      reasonCode: policy.reasonCode,
      decisionReason: policy.reason,
      status: "pending_human_review",
      isActive: true,
    });
    return {
      ok: true,
      data: { refund: { orderId, decision: "escalated", status: row.status, reasonCode: policy.reasonCode, reason: policy.reason } },
      customerFacingSummary: `Needs human review: ${policy.reason}`,
    };
  }

  // Approve path: atomic order update first (filter refundStatus none = duplicate guard).
  const updated = await OrderModel.findOneAndUpdate(
    { orderId, customerId, refundStatus: "none" },
    { $set: { refundStatus: "refunded" } },
    { returnDocument: "after" }
  ).lean();
  if (!updated) {
    const dup = await RefundRequestModel.findOne({ orderId }).sort({ createdAt: -1 }).lean();
    const d = dup as unknown as { decision?: string; status?: string; reasonCode?: string; decisionReason?: string } | null;
    return {
      ok: true,
      data: {
        refund: {
          orderId,
          decision: d?.decision ?? "denied",
          status: d?.status ?? "denied",
          reasonCode: d?.reasonCode ?? "ALREADY_REFUNDED_OR_DUPLICATE",
          reason: "Duplicate blocked: order already refunded.",
        },
        duplicate: true,
      },
      customerFacingSummary: "This order was already refunded.",
    };
  }
  try {
    const row = await RefundRequestModel.create({
      refundRequestId: newId(),
      customerId,
      orderId,
      reason,
      eligibilityStatus: policy.reasonCode,
      decision: "approved",
      reasonCode: policy.reasonCode,
      decisionReason: "Simulated refund approved per policy v1. No money moved.",
      status: "simulated_processed",
      isActive: true,
    });
    return {
      ok: true,
      data: { refund: { orderId, decision: "approved", status: row.status, reasonCode: policy.reasonCode, reason: "Simulated refund approved. No money moved." } },
      customerFacingSummary: "Refund approved (simulated — no money moved).",
    };
  } catch (e: unknown) {
    // Backstop: unique partial index rejected the insert — roll back the order update.
    await OrderModel.findOneAndUpdate({ orderId, customerId }, { $set: { refundStatus: "none" } });
    const msg = e instanceof Error ? e.message : "insert failed";
    if (msg.includes("E11000") || msg.includes("duplicate")) {
      return {
        ok: true,
        data: { refund: { orderId, decision: "escalated", status: "pending_human_review", reasonCode: "DUPLICATE_RACE", reason: "Duplicate blocked by database." }, duplicate: true },
        customerFacingSummary: "A refund request already exists for this order.",
      };
    }
    return { ok: false, error: { code: "DB_ERROR", message: "Could not record refund.", retryable: true }, customerFacingSummary: "Something went wrong recording the refund." };
  }
}
