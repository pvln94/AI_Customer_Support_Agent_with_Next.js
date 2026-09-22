// Server context injected by the agent loop — never taken from LLM arguments
// (except identifyCustomer). WHY: stops the LLM inventing another customer's ID.
export interface ToolContext {
  verifiedCustomerId: string | null;
  setVerifiedCustomerId: (id: string) => void;
  conversationId: string;
  requestId: string;
}
