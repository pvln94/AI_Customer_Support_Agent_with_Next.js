import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    await connectDB();
    const order = await OrderModel.findOne({ orderId }).lean();
    if (!order)
      return Response.json({ error: { code: "NOT_FOUND", message: "Order not found." } }, { status: 404 });
    return Response.json({ order });
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Lookup failed." } }, { status: 503 });
  }
}
