// The plug socket for the AI model — defines what "chat with tools" looks like so the real provider (or a fake one in tests) can slot in (used by lib/agent/loop.ts and lib/llm/openai-compatible.ts).
// WHY: small interface keeps the agent testable (fake provider) and lets us
// point at any OpenAI-compatible endpoint via env vars.

export interface LLMToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: unknown;
}

export interface LLMToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface LLMResult {
  text: string;
  toolCalls: LLMToolCall[];
}

export interface LLMProvider {
  chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMResult>;
}
