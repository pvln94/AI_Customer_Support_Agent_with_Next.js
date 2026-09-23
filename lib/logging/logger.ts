// LAYMAN: Writes one-line diary entries of what the agent did (tool picked, result, decision) for the admin timeline to display; logging can never crash the chat (used by lib/agent/loop.ts).
import { AgentLogModel } from "@/models/AgentLog";
import { summarize } from "./mask";
import type { AgentEventType } from "@/types";

// WHY: observable events only — never store chain-of-thought or PII verbatim.
export async function logEvent(input: {
  requestId: string;
  eventType: AgentEventType;
  status: "success" | "error" | "info";
  customerId?: string;
  orderId?: string;
  toolName?: string;
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AgentLogModel.create({
      ...input,
      inputSummary: input.inputSummary ? summarize(input.inputSummary) : undefined,
      outputSummary: input.outputSummary ? summarize(input.outputSummary) : undefined,
      errorMessage: input.errorMessage ? summarize(input.errorMessage) : undefined,
      timestamp: new Date(),
    });
  } catch {
    // Logging must never break the refund flow.
  }
}
