// Tool 6 of 6 — hands the chat to a human for cases outside the rules, like disputes (called by the agent).
import { escalateSchema } from "@/lib/validation/schemas";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";

export const name = "escalateToHuman";
export const description =
  "Escalate to a human for out-of-policy situations (customer demands human, dispute, repeated failures).";
export const parameters = {
  type: "object",
  properties: { reason: { type: "string" } },
  required: ["reason"],
};

export async function run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
  const parsed = escalateSchema.safeParse(args);
  if (!parsed.success)
    return { ok: false, error: { code: "INVALID_ARGS", message: "reason required.", retryable: false }, customerFacingSummary: "What should I tell the human team?" };
  if (!ctx.verifiedCustomerId)
    return { ok: false, error: { code: "NOT_VERIFIED", message: "Verify customer first.", retryable: false }, customerFacingSummary: "Please share your customer ID and email first." };
  return {
    ok: true,
    data: { escalated: true, reason: parsed.data.reason },
    customerFacingSummary: "I've flagged this for a human agent.",
  };
}
