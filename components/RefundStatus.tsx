// components/RefundStatus.tsx
"use client";

import type { RefundSummary } from "@/types";

// WHY: tiny badge driven only by the structured refund object (never LLM text).
export default function RefundStatus({ refund }: { refund?: RefundSummary }) {
  if (!refund) return null;
  const color =
    refund.decision === "approved"
      ? "bg-green-100 text-green-800 border-green-300"
      : refund.decision === "denied"
        ? "bg-red-100 text-red-800 border-red-300"
        : "bg-yellow-100 text-yellow-800 border-yellow-300";
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      {refund.decision.toUpperCase()} · {refund.orderId} · {refund.status}
    </span>
  );
}
