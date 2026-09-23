// lib/agent/truthfulness.ts
// WHY: regex heuristic — the LLM sometimes claims success without a tool.
// This guard replaces such text with a safe template and logs the mismatch.
const APPROVAL_CLAIM =
  /\b(refund\w*\s+(was\s+)?(approved|processed|completed|issued)|approv\w+\s+(your\s+)?refund|money\s+(sent|refunded|returned|on\s+its\s+way))/i;

export function claimsApproval(text: string): boolean {
  return APPROVAL_CLAIM.test(text);
}

export const SAFE_FALLBACK =
  "I couldn't confirm a refund just now. Please share your customer ID, email, and order ID and I'll check the status with our tools.";
