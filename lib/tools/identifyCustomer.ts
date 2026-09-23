// LAYMAN: Tool 1 of 6 — checks your customer ID + email against the database and marks this chat as verified (called by the agent; error message never reveals which field was wrong).
import { connectDB } from "@/lib/mongodb";
import { CustomerModel } from "@/models/Customer";
import { ConversationModel } from "@/models/Conversation";
import { identifyCustomerSchema } from "@/lib/validation/schemas";
import type { ToolContext } from "./context";
import type { ToolResult } from "@/types";
import { shouldSimulateFailure } from "./simulate";

export const name = "identifyCustomer";
export const description =
  "Verify a customer by customerId AND email. Call this first before any order lookup.";
export const parameters = {
  type: "object",
  properties: {
    customerId: { type: "string", description: "e.g. CUST-001" },
    email: { type: "string", description: "account email" },
  },
  required: ["customerId", "email"],
};

export async function run(args: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (shouldSimulateFailure(name))
    return { ok: false, error: { code: "TRANSIENT", message: "Temporary lookup failure.", retryable: true }, customerFacingSummary: "Lookup hiccup — retrying." };
  const parsed = identifyCustomerSchema.safeParse(args);
  if (!parsed.success)
    return { ok: false, error: { code: "INVALID_ARGS", message: "customerId and valid email required.", retryable: false }, customerFacingSummary: "Please share your customer ID and email." };
  await connectDB();
  const c = await CustomerModel.findOne({
    customerId: parsed.data.customerId,
    email: parsed.data.email.toLowerCase(),
  }).lean();
  // WHY: generic message — never reveal which field was wrong.
  if (!c)
    return { ok: false, error: { code: "IDENTITY_MISMATCH", message: "No matching customer.", retryable: false }, customerFacingSummary: "I couldn't verify that ID and email combination." };
  ctx.setVerifiedCustomerId(c.customerId as string);
  await ConversationModel.findOneAndUpdate(
    { conversationId: ctx.conversationId },
    { $set: { verifiedCustomerId: c.customerId } }
  );
  return {
    ok: true,
    data: { customerId: c.customerId, name: c.name, accountStatus: c.accountStatus },
    customerFacingSummary: `Verified as ${(c.name as string)}.`,
  };
}
