// LAYMAN: Admin endpoint that dry-runs the refund rules for an order without changing anything (uses the same policy engine as the agent).
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { CustomerModel } from "@/models/Customer";
import { RefundRequestModel } from "@/models/RefundRequest";
import { evaluateRefundPolicy } from "@/lib/refund/policy";
import type { OrderDoc } from "@/types";

export const dynamic = "force-dynamic";

const schema = z.object({ orderId: z.string().min(1), customerId: z.string().min(1) });

// WHY: admin validate reuses the exact policy engine the agent uses.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "orderId and customerId required." } }, { status: 400 });
  try {
    await connectDB();
    const order = await OrderModel.findOne({ orderId: parsed.data.orderId, customerId: parsed.data.customerId }).lean();
    const customer = await CustomerModel.findOne({ customerId: parsed.data.customerId }).lean();
    if (!order)
      return Response.json({ error: { code: "NOT_FOUND", message: "Order not found." } }, { status: 404 });
    const active = await RefundRequestModel.findOne({ orderId: parsed.data.orderId, isActive: true }).lean();
    const result = evaluateRefundPolicy({
      order: order as unknown as OrderDoc,
      verifiedCustomerId: parsed.data.customerId,
      customerAccountStatus: (customer?.accountStatus as "active" | "suspended") ?? "active",
      hasActiveRefund: !!active,
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Validation failed." } }, { status: 503 });
  }
}
