// lib/tools/checkRefundEligibility.ts
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { CustomerModel } from "@/models/Customer";
import { RefundRequestModel } from "@/models/RefundRequest";
import { orderIdSchema } from "@/lib/validation/schemas";
import { evaluateRefundPolicy } from "@/lib/refund/policy";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";
import { shouldSimulateFailure } from "./simulate";
import type { OrderDoc } from "@/types";

export const name = "checkRefundEligibility";
export const description = "Read-only dry run of the refund policy for an order. No changes made.";
export const parameters = {
  type: "object",
  properties: { orderId: { type: "string" } },
  required: ["orderId"],
};

export async function run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (shouldSimulateFailure(name))
    return { ok: false, error: { code: "TRANSIENT", message: "Temporary failure.", retryable: true }, customerFacingSummary: "Eligibility check hiccup — retrying." };
  const parsed = orderIdSchema.safeParse(args);
  if (!parsed.success)
    return { ok: false, error: { code: "INVALID_ARGS", message: "orderId required.", retryable: false }, customerFacingSummary: "Which order should I check?" };
  if (!ctx.verifiedCustomerId)
    return { ok: false, error: { code: "NOT_VERIFIED", message: "Verify customer first.", retryable: false }, customerFacingSummary: "Please share your customer ID and email first." };
  await connectDB();
  const o = await OrderModel.findOne({
    orderId: parsed.data.orderId,
    customerId: ctx.verifiedCustomerId,
  }).lean();
  if (!o)
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found.", retryable: false }, customerFacingSummary: "I couldn't find that order for your account." };
  const customer = await CustomerModel.findOne({ customerId: ctx.verifiedCustomerId }).lean();
  const active = await RefundRequestModel.findOne({ orderId: o.orderId, isActive: true }).lean();
  // WHY: dry run only — submitRefundRequest re-runs this from fresh DB data.
  const result = evaluateRefundPolicy({
    order: o as unknown as OrderDoc,
    verifiedCustomerId: ctx.verifiedCustomerId,
    customerAccountStatus: (customer?.accountStatus as "active" | "suspended") ?? "active",
    hasActiveRefund: !!active,
  });
  return {
    ok: true,
    data: result,
    customerFacingSummary:
      result.decision === "approve"
        ? "This order looks eligible."
        : result.decision === "escalate"
          ? "This order needs human review."
          : `Not eligible: ${result.reason}`,
  };
}
