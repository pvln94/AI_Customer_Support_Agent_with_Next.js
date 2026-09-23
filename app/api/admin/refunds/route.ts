// Admin endpoint that lists all refund records, filterable by decision/status (called by the AdminDashboard refunds tab).
import { connectDB } from "@/lib/mongodb";
import { RefundRequestModel } from "@/models/RefundRequest";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const decision = url.searchParams.get("decision") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  try {
    await connectDB();
    const q: Record<string, unknown> = {};
    if (decision) q.decision = decision;
    if (status) q.status = status;
    const refunds = await RefundRequestModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
    return Response.json({ refunds });
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Could not load refunds." } }, { status: 503 });
  }
}
