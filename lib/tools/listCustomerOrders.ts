// lib/tools/listCustomerOrders.ts
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";
import { shouldSimulateFailure } from "./simulate";

export const name = "listCustomerOrders";
export const description = "List orders for the verified customer. No arguments.";
export const parameters = { type: "object", properties: {}, required: [] };

export async function run(_args: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (shouldSimulateFailure(name))
    return { ok: false, error: { code: "TRANSIENT", message: "Temporary failure.", retryable: true }, customerFacingSummary: "Order lookup hiccup — retrying." };
  if (!ctx.verifiedCustomerId)
    return { ok: false, error: { code: "NOT_VERIFIED", message: "Verify customer first.", retryable: false }, customerFacingSummary: "Please share your customer ID and email first." };
  await connectDB();
  const orders = await OrderModel.find({ customerId: ctx.verifiedCustomerId })
    .sort({ purchaseDate: -1 })
    .lean();
  const slim = orders.map((o) => ({
    orderId: o.orderId,
    productName: o.productName,
    productCategory: o.productCategory,
    price: o.price,
    orderStatus: o.orderStatus,
    refundStatus: o.refundStatus,
  }));
  return {
    ok: true,
    data: { orders: slim },
    customerFacingSummary: slim.length ? `Found ${slim.length} order(s).` : "No orders found.",
  };
}
