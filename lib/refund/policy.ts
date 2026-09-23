// lib/refund/policy.ts
// Refund Policy v1 — pure function, no DB access.
// WHY: rules live in code (not the prompt) so prompt injection cannot approve.
// The LLM is the conversation layer; this file is the decision layer.

import type {
  AccountStatus,
  OrderDoc,
  ProductCategory,
} from "@/types";

export const POLICY_VERSION = "v1";
export const REFUND_WINDOW_DAYS = 30;
export const DEFECT_WINDOW_DAYS = 90;
export const HIGH_VALUE_CENTS = 50000; // $500

export interface PolicyChecks {
  orderOwnedByCustomer: boolean;
  orderDelivered: boolean;
  paymentCompleted: boolean;
  categoryRefundable: boolean;
  notPreviouslyRefunded: boolean;
  withinRefundWindow: boolean;
  conditionAcceptable: boolean;
  noHighValueFlag: boolean;
  accountInGoodStanding: boolean;
}

export interface PolicyResult {
  decision: "approve" | "deny" | "escalate";
  eligible: boolean;
  reasonCode: string;
  reason: string;
  checks: PolicyChecks;
  policyVersion: string;
}

export interface PolicyInput {
  order: OrderDoc | null; // null = not found
  verifiedCustomerId: string | null;
  customerAccountStatus: AccountStatus;
  hasActiveRefund: boolean;
  now?: Date; // injectable clock for tests
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - new Date(a).getTime();
  return Math.floor(ms / 86_400_000);
}

function isDefectLike(condition: OrderDoc["productCondition"]): boolean {
  return condition === "defective" || condition === "damaged_on_arrival";
}

function categoryRefundable(cat: ProductCategory): boolean {
  return cat !== "digital" && cat !== "final_sale";
}

// Compute ALL checks (better logs), then apply: deny > escalate > approve.
export function evaluateRefundPolicy(input: PolicyInput): PolicyResult {
  const now = input.now ?? new Date();
  const { order, verifiedCustomerId, customerAccountStatus, hasActiveRefund } = input;

  // Missing order or wrong owner share one result (avoids leaking ownership).
  if (!order || !verifiedCustomerId || order.customerId !== verifiedCustomerId) {
    return {
      decision: "deny",
      eligible: false,
      reasonCode: "ORDER_NOT_FOUND_OR_NOT_OWNED",
      reason: "Order was not found for this customer.",
      checks: {
        orderOwnedByCustomer: false,
        orderDelivered: false,
        paymentCompleted: false,
        categoryRefundable: false,
        notPreviouslyRefunded: !hasActiveRefund,
        withinRefundWindow: false,
        conditionAcceptable: false,
        noHighValueFlag: true,
        accountInGoodStanding: customerAccountStatus === "active",
      },
      policyVersion: POLICY_VERSION,
    };
  }

  const daysSince = daysBetween(order.purchaseDate, now);
  const windowDays = isDefectLike(order.productCondition)
    ? DEFECT_WINDOW_DAYS
    : REFUND_WINDOW_DAYS;

  const checks: PolicyChecks = {
    orderOwnedByCustomer: true,
    orderDelivered: order.orderStatus === "delivered",
    paymentCompleted: order.paymentStatus === "paid",
    categoryRefundable: categoryRefundable(order.productCategory),
    // R5: refundStatus none AND no active request row.
    notPreviouslyRefunded: order.refundStatus === "none" && !hasActiveRefund,
    withinRefundWindow: daysSince >= 0 && daysSince <= windowDays,
    conditionAcceptable: order.productCondition !== "customer_damaged",
    noHighValueFlag: order.price <= HIGH_VALUE_CENTS,
    accountInGoodStanding: customerAccountStatus === "active",
  };

  // Hard-deny rules R2..R7 (R1 handled above).
  if (!checks.orderDelivered)
    return deny("NOT_DELIVERED", "Order has not been delivered yet.", checks);
  if (!checks.paymentCompleted)
    return deny("PAYMENT_NOT_COMPLETED", "Payment is not completed for this order.", checks);
  if (!checks.categoryRefundable)
    return deny(
      "CATEGORY_NOT_REFUNDABLE",
      `Category ${order.productCategory} is not refundable.`,
      checks
    );
  if (!checks.notPreviouslyRefunded)
    return deny(
      "ALREADY_REFUNDED_OR_DUPLICATE",
      "This order already has a refund or an active refund request.",
      checks
    );
  if (!checks.withinRefundWindow)
    return deny(
      "REFUND_WINDOW_EXPIRED",
      `Refund window expired (${daysSince} days ago; limit ${windowDays} days).`,
      checks
    );
  if (!checks.conditionAcceptable)
    return deny(
      "CONDITION_NOT_ACCEPTABLE",
      "Items damaged by the customer are not eligible.",
      checks
    );

  // Escalation rules E1..E2 (only when no hard deny applies).
  if (!checks.noHighValueFlag)
    return {
      decision: "escalate",
      eligible: false,
      reasonCode: "ESCALATE_HIGH_VALUE",
      reason: "Order value exceeds $500 and needs human review.",
      checks,
      policyVersion: POLICY_VERSION,
    };
  if (!checks.accountInGoodStanding)
    return {
      decision: "escalate",
      eligible: false,
      reasonCode: "ESCALATE_ACCOUNT_SUSPENDED",
      reason: "Account is suspended; a human must review.",
      checks,
      policyVersion: POLICY_VERSION,
    };

  return {
    decision: "approve",
    eligible: true,
    reasonCode: "APPROVED",
    reason: "Order meets all refund policy requirements.",
    checks,
    policyVersion: POLICY_VERSION,
  };
}

function deny(reasonCode: string, reason: string, checks: PolicyChecks): PolicyResult {
  return { decision: "deny", eligible: false, reasonCode, reason, checks, policyVersion: POLICY_VERSION };
}
