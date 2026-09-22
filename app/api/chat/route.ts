import { runAgent } from "@/lib/agent/loop";
import { chatRequestSchema } from "@/lib/validation/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || "local");
}

export async function POST(req: Request) {
  if (!rateLimit(`chat:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "Invalid JSON." } }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      { status: 400 }
    );
  }
  try {
    const result = await runAgent({ conversationId: parsed.data.conversationId, message: parsed.data.message });
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Agent failed";
    const isLLM = /LLM_API_KEY|LLM_MODEL/i.test(msg);
    return Response.json(
      { error: { code: isLLM ? "LLM_CONFIG_ERROR" : "INTERNAL", message: isLLM ? msg : "Something went wrong." } },
      { status: isLLM ? 502 : 500 }
    );
  }
}
