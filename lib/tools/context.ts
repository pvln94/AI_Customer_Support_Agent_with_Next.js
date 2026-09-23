// LAYMAN: The agent's ID badge — carries the verified customer and request IDs into every tool so the AI can never pretend to be someone else (used by lib/agent/loop.ts and every tool).
// Server context injected by the agent loop — never taken from LLM arguments
// (except identifyCustomer). WHY: stops the LLM inventing another customer's ID.
export interface ToolContext {
  verifiedCustomerId: string | null;
  setVerifiedCustomerId: (id: string) => void;
  conversationId: string;
  requestId: string;
}
