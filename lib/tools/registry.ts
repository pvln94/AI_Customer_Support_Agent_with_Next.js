// lib/tools/registry.ts
import * as identifyCustomer from "./identifyCustomer";
import * as listCustomerOrders from "./listCustomerOrders";
import * as getOrderDetails from "./getOrderDetails";
import * as checkRefundEligibility from "./checkRefundEligibility";
import * as submitRefundRequest from "./submitRefundRequest";
import * as escalateToHuman from "./escalateToHuman";
import type { LLMToolDef } from "@/lib/llm/provider";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";

// WHY: single registry keeps LLM tool definitions and server execution in sync.
const tools = {
  identifyCustomer,
  listCustomerOrders,
  getOrderDetails,
  checkRefundEligibility,
  submitRefundRequest,
  escalateToHuman,
};

export type ToolName = keyof typeof tools;

export function toolDefinitions(): LLMToolDef[] {
  return Object.values(tools).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export async function executeTool(
  toolName: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  const tool = (tools as Record<string, { run: (a: unknown, c: ToolContext) => Promise<ToolResult> }>)[toolName];
  if (!tool) {
    return {
      ok: false,
      error: { code: "UNKNOWN_TOOL", message: `Unknown tool ${toolName}.`, retryable: false },
      customerFacingSummary: "I hit an internal error.",
    };
  }
  // 5s timeout so a stuck tool cannot hang the chat turn.
  return Promise.race([
    tool.run(args, ctx),
    new Promise<ToolResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: false,
            error: { code: "TIMEOUT", message: "Tool timed out.", retryable: true },
            customerFacingSummary: "That took too long — retrying.",
          }),
        5000
      )
    ),
  ]);
}
