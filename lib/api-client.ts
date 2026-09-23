// lib/api-client.ts
// WHY: one client keeps frontend calls, zod shapes, and API routes consistent.
import type { RefundSummary } from "@/types";

export interface ChatResponse {
  conversationId: string;
  requestId: string;
  reply: string;
  refund?: RefundSummary;
}

export async function sendChat(conversationId: string | null, message: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: conversationId ?? undefined, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Chat request failed");
  return data as ChatResponse;
}
