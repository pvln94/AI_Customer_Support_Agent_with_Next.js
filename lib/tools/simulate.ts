// lib/tools/simulate.ts
// SIMULATE_FAILURE e.g. "getOrderDetails:1,submitRefundRequest:2".
// WHY: lets the demo force transient failures to show retry logic.
const counters = new Map<string, number>();
let parsed = false;

function parse() {
  if (parsed) return;
  parsed = true;
  const raw = process.env.SIMULATE_FAILURE ?? "";
  for (const part of raw.split(",")) {
    const [name, n] = part.split(":").map((s) => s.trim());
    if (name && n && Number.isFinite(Number(n))) counters.set(name, Number(n));
  }
}

export function shouldSimulateFailure(toolName: string): boolean {
  parse();
  const left = counters.get(toolName) ?? 0;
  if (left > 0) {
    counters.set(toolName, left - 1);
    return true;
  }
  return false;
}

export function resetSimulate() {
  counters.clear();
  parsed = false;
}
