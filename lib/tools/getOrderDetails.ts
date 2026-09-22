import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { orderIdSchema } from "@/lib/validation/schemas";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";
import { shouldSimulateFailure } from "./simulate";

export const name = "getOrderDetails";
export const description = "Get details of one order belonging to the verified customer.";
export const parameters = {
  type: "object",
  properties: { orderId: { type: "string", description: "e.g. ORD-1001" } },
  required: ["orderId"],
};

export async function run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (shouldSimulateFailure(name))
    return { ok: false, error: { code: "TRANSIENT", message: "Temporary order fetch failure.", retryable: true }, customerFacingSummary: "Order lookup hiccup — retrying." };
  const parsed = orderIdSchema.safeParse(args);
  if (!parsed.success)
    return { ok: false, error: { code: "INVALID_ARGS", message: "orderId required.", retryable: false }, customerFacingSummary: "Which order ID should I look up?" };
  if (!ctx.verifiedCustomerId)
    return { ok: false, error: { code: "NOT_VERIFIED", message: "Verify customer first.", retryable: false }, customerFacingSummary: "Please share your customer ID and email first." };
  await connectDB();
  // WHY: ownership-checked; wrong owner returns same "not found" as nonexistent.
  const o = await OrderModel.findOne({
    orderId: parsed.data.orderId,
    customerId: ctx.verifiedCustomerId,
  }).lean();
  if (!o)
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found.", retryable: false }, customerFacingSummary: "I couldn't find that order for your account." };
  return {
    ok: true,
    data: {
      orderId: o.orderId,
      productName: o.productName,
      productCategory: o.productCategory,
      purchaseDate: o.purchaseDate,
      price: o.price,
      currency: o.currency,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      refundStatus: o.refundStatus,
      productCondition: o.productCondition,
    },
    customerFacingSummary: `Order ${o.orderId}: ${o.productName}, status ${o.orderStatus}.`,
  };
}
