// LAYMAN: The agent's brain — takes your message, talks to the AI model in up to 6 rounds, runs whatever tools it asks for, and returns the reply plus the refund decision (called by app/api/chat/route.ts).
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { ConversationModel } from "@/models/Conversation";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { claimsApproval, SAFE_FALLBACK } from "./truthfulness";
import { toolDefinitions, executeTool } from "@/lib/tools/registry";
import type { ToolContext } from "@/lib/tools/context";
import { logEvent } from "@/lib/logging/logger";
import type { LLMProvider, LLMMessage } from "@/lib/llm/provider";
import { OpenAICompatibleProvider } from "@/lib/llm/openai-compatible";
import type { RefundSummary } from "@/types";

export const MAX_ITERATIONS = 6;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableLLMError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.message} ${(e as { status?: unknown }).status} ${(e as { code?: unknown }).code}` : String(e);
  return /429|5\d\d|timeout|network|ECONN|ETIMEDOUT|fetch failed/i.test(msg);
}

export async function callLLMWithRetry(
  provider: LLMProvider,
  messages: LLMMessage[],
  tools: ReturnType<typeof toolDefinitions>,
  maxRetries = 2
): Promise<Awaited<ReturnType<LLMProvider["chat"]>>> {
  let last: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await provider.chat(messages, tools);
    } catch (e) {
      last = e;
      if (attempt < maxRetries && isRetryableLLMError(e)) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

export interface AgentRunInput {
  conversationId?: string;
  message: string;
  provider?: LLMProvider; // injected fake in tests; defaults to OpenAI-compatible
}

export async function runAgent(input: AgentRunInput): Promise<{
  conversationId: string;
  requestId: string;
  reply: string;
  refund?: RefundSummary;
}> {
  const requestId = `req_${randomUUID().slice(0, 8)}`;
  await connectDB();

  let conversation = input.conversationId
    ? await ConversationModel.findOne({ conversationId: input.conversationId })
    : null;
  if (!conversation) {
    conversation = await ConversationModel.create({
      conversationId: input.conversationId ?? `conv_${randomUUID().slice(0, 8)}`,
      messages: [],
    });
  }
  const conversationId: string = conversation.conversationId as string;
  let verifiedCustomerId: string | null = (conversation.verifiedCustomerId as string | undefined) ?? null;

  const ctx: ToolContext = {
    verifiedCustomerId,
    setVerifiedCustomerId: (id: string) => {
      verifiedCustomerId = id;
      ctx.verifiedCustomerId = id;
    },
    conversationId,
    requestId,
  };
  ctx.verifiedCustomerId = verifiedCustomerId;

  await logEvent({ requestId, eventType: "request_received", status: "info", customerId: verifiedCustomerId ?? undefined });

  // Persist user message first (only user/assistant text is stored).
  conversation.messages.push({ role: "user", content: input.message, timestamp: new Date() });
  await conversation.save();

  const history: LLMMessage[] = (conversation.messages as { role: string; content: string }[])
    .slice(-20)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const messages: LLMMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const tools = toolDefinitions();
  const provider = input.provider ?? new OpenAICompatibleProvider();

  let refund: RefundSummary | undefined;
  let approvedInThisTurn = false;
  let finalText = "";

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      let llm;
      try {
        llm = await callLLMWithRetry(provider, messages, tools, 2);
      } catch (e) {
        await logEvent({ requestId, eventType: "failure", status: "error", customerId: verifiedCustomerId ?? undefined, errorMessage: e instanceof Error ? e.message : String(e) });
        finalText = "Our support system is temporarily unavailable. Please try again in a moment.";
        break;
      }

      if (!llm.toolCalls.length) {
        finalText = llm.text || "How else can I help with your order?";
        break;
      }

      // Relay assistant tool-call intentions (no reasoning stored).
      for (const tc of llm.toolCalls) {
        messages.push({ role: "assistant", content: llm.text || "", toolCallId: tc.id, toolName: tc.name, toolArgs: tc.args });
      }

      for (const tc of llm.toolCalls) {
        await logEvent({ requestId, eventType: "tool_selected", status: "info", customerId: verifiedCustomerId ?? undefined, toolName: tc.name, inputSummary: JSON.stringify(tc.args) });
        await logEvent({ requestId, eventType: "tool_started", status: "info", customerId: verifiedCustomerId ?? undefined, toolName: tc.name });

        // Run with up to 2 retries on retryable errors only.
        let result = await executeTool(tc.name, tc.args, ctx);
        for (let r = 0; r < 2 && !result.ok && result.error.retryable; r++) {
          await logEvent({ requestId, eventType: "retry", status: "info", customerId: verifiedCustomerId ?? undefined, toolName: tc.name, outputSummary: `retry ${r + 1}` });
          await sleep(200 * (r + 1));
          result = await executeTool(tc.name, tc.args, ctx);
        }

        await logEvent({
          requestId, eventType: "tool_result", status: result.ok ? "success" : "error",
          customerId: verifiedCustomerId ?? undefined, toolName: tc.name,
          outputSummary: JSON.stringify(result).slice(0, 500),
          errorMessage: result.ok ? undefined : result.error.message,
        });

        // Capture refund object from tool result (never from LLM text).
        if (result.ok && tc.name === "submitRefundRequest") {
          const data = result.data as { refund?: RefundSummary };
          if (data?.refund) {
            refund = data.refund;
            if (data.refund.decision === "approved") approvedInThisTurn = true;
          }
        }
        // Return structured result to the LLM as a tool message.
        messages.push({ role: "tool", content: JSON.stringify(result), toolCallId: tc.id, toolName: tc.name });
      }

      if (iter === MAX_ITERATIONS - 1) {
        await logEvent({ requestId, eventType: "escalation", status: "info", customerId: verifiedCustomerId ?? undefined, outputSummary: "max iterations reached" });
        finalText = "This is taking a few extra steps — I've flagged it for a human agent, but please share your customer ID, email, and order ID and I'll keep checking.";
      }
    }
  } catch (e) {
    await logEvent({ requestId, eventType: "failure", status: "error", errorMessage: e instanceof Error ? e.message : String(e) });
    finalText = finalText || "Something went wrong. Please try again.";
  }

  if (!finalText) finalText = SAFE_FALLBACK;

  // Truthfulness guard: claims of approval without an approving tool result are replaced.
  if (claimsApproval(finalText) && !approvedInThisTurn) {
    await logEvent({ requestId, eventType: "failure", status: "error", customerId: verifiedCustomerId ?? undefined, outputSummary: "truthfulness guard triggered", errorMessage: finalText.slice(0, 200) });
    finalText = SAFE_FALLBACK;
  }

  await logEvent({
    requestId, eventType: "final_decision", status: "info",
    customerId: verifiedCustomerId ?? undefined,
    outputSummary: refund ? `${refund.decision} ${refund.orderId}` : "no refund decision",
  });

  conversation.messages.push({ role: "assistant", content: finalText, timestamp: new Date() });
  if (verifiedCustomerId) conversation.verifiedCustomerId = verifiedCustomerId;
  await conversation.save();
  await logEvent({ requestId, eventType: "response_sent", status: "success", customerId: verifiedCustomerId ?? undefined });

  return { conversationId, requestId, reply: finalText, refund };
}
