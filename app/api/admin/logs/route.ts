import { connectDB } from "@/lib/mongodb";
import { AgentLogModel } from "@/models/AgentLog";
import { adminLogsQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// WHY: indexed newest-first query keeps the admin timeline fast.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = adminLogsQuerySchema.safeParse({
    eventType: url.searchParams.get("eventType") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    requestId: url.searchParams.get("requestId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    before: url.searchParams.get("before") ?? undefined,
  });
  if (!parsed.success)
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid query." } }, { status: 400 });
  try {
    await connectDB();
    const q: Record<string, unknown> = {};
    if (parsed.data.eventType) q.eventType = parsed.data.eventType;
    if (parsed.data.status) q.status = parsed.data.status;
    if (parsed.data.customerId) q.customerId = parsed.data.customerId;
    if (parsed.data.requestId) q.requestId = parsed.data.requestId;
    if (parsed.data.before) q.timestamp = { $lt: new Date(parsed.data.before) };
    const logs = await AgentLogModel.find(q).sort({ timestamp: -1 }).limit(parsed.data.limit).lean();
    return Response.json({ logs });
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Could not load logs." } }, { status: 503 });
  }
}
