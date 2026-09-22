import { z } from "zod";
import { run as submitRun } from "@/lib/tools/submitRefundRequest";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  reason: z.string().min(1).max(500).default("admin manual process"),
});

// WHY: admin process reuses the same write-tool code path as the agent (no forked logic).
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "orderId, customerId, reason required." } }, { status: 400 });
  const result = await submitRun(
    { orderId: parsed.data.orderId, reason: parsed.data.reason },
    {
      verifiedCustomerId: parsed.data.customerId,
      setVerifiedCustomerId: () => {},
      conversationId: "admin",
      requestId: `admin_${Date.now()}`,
    }
  );
  if (!result.ok)
    return Response.json({ error: { code: result.error.code, message: result.error.message } }, { status: 400 });
  return Response.json(result);
}
