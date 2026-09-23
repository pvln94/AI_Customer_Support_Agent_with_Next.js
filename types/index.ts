// types/index.ts
// Central business types. WHY: one place keeps API, tools, policy, and UI consistent.

export type AccountStatus = "active" | "suspended";
export type ProductCategory =
  | "electronics"
  | "apparel"
  | "home"
  | "digital"
  | "final_sale";
export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "failed";
export type RefundStatusValue = "none" | "pending_review" | "refunded";
export type ProductCondition =
  | "as_delivered"
  | "defective"
  | "damaged_on_arrival"
  | "customer_damaged";

export interface CustomerDoc {
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  accountStatus: AccountStatus;
}

export interface OrderDoc {
  orderId: string;
  customerId: string;
  productName: string;
  productCategory: ProductCategory;
  purchaseDate: Date;
  price: number; // integer cents
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatusValue;
  productCondition: ProductCondition;
}

export type RefundDecision = "approved" | "denied" | "escalated";
export type RefundRecordStatus =
  | "simulated_processed"
  | "denied"
  | "pending_human_review"
  | "failed";

export interface RefundRequestDoc {
  refundRequestId: string;
  customerId: string;
  orderId: string;
  reason: string;
  eligibilityStatus: string;
  decision: RefundDecision;
  reasonCode: string;
  decisionReason: string;
  status: RefundRecordStatus;
  isActive: boolean;
}

export type AgentEventType =
  | "request_received"
  | "intent_identified"
  | "tool_selected"
  | "tool_started"
  | "tool_result"
  | "policy_validation"
  | "retry"
  | "failure"
  | "final_decision"
  | "escalation"
  | "response_sent";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Structured result every tool returns. WHY: LLM and UI can rely on one shape.
export type ToolResult =
  | { ok: true; data: unknown; customerFacingSummary: string }
  | {
      ok: false;
      error: { code: string; message: string; retryable: boolean };
      customerFacingSummary: string;
    };

// Refund object returned to the chat UI (comes from tool result, never LLM text).
export interface RefundSummary {
  orderId: string;
  decision: RefundDecision;
  status: RefundRecordStatus;
  reasonCode: string;
  reason: string;
}
