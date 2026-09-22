import OpenAI from "openai";
import type { LLMMessage, LLMProvider, LLMResult, LLMToolDef } from "./provider";

// WHY: adapter isolates SDK specifics; agent code only knows LLMProvider.chat().
export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseURL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    if (!apiKey) throw new Error("LLM_API_KEY is missing in .env.local.");
    if (!model) throw new Error("LLM_MODEL is missing in .env.local (never hardcode a model).");
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMResult> {
    const mapped = messages.map((m) => {
      if (m.role === "tool") {
        return { role: "tool" as const, content: m.content, tool_call_id: m.toolCallId ?? "" };
      }
      if (m.role === "assistant" && m.toolName) {
        return {
          role: "assistant" as const,
          content: m.content || null,
          tool_calls: [
            {
              id: m.toolCallId ?? "",
              type: "function" as const,
              function: { name: m.toolName, arguments: JSON.stringify(m.toolArgs ?? {}) },
            },
          ],
        };
      }
      return { role: m.role as "system" | "user" | "assistant", content: m.content };
    });

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: mapped as never,
      tools: tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters as never },
      })),
      tool_choice: "auto",
    });

    const choice = res.choices[0]?.message;
    const toolCalls = (choice?.tool_calls ?? [])
      .filter((c) => c.type === "function")
      .map((c, i) => {
        const fn = (c as { function: { name: string; arguments: string } }).function;
        let args: unknown = {};
        try {
          args = fn.arguments ? JSON.parse(fn.arguments) : {};
        } catch {
          args = { _parseError: fn.arguments };
        }
        return { id: (c as { id?: string }).id ?? `call_${i}`, name: fn.name, args };
      });

    return { text: choice?.content ?? "", toolCalls };
  }
}
