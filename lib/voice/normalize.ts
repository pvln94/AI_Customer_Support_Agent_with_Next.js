// LAYMAN: Translator for spoken words — turns "at the rate" into @, "dot" into ., "001" into CUST-001 before voice text enters the chat; typed messages skip this (used by components/VoiceInput.tsx; covered by unit tests).
// WHY: speech recognition returns words, not symbols — "Priya dot Nair at
// the rate example dot test" must become priya.nair@example.test, and
// "customer ID is 001" must become CUST-001, or verification always fails.
// Pure function (unit-tested); applied to voice transcripts only, typed input
// passes through untouched.
export function normalizeSpokenInput(text: string): string {
  let out = ` ${text} `;

  // Business IDs: "cust 001", "customer ID is 001" -> CUST-001;
  // "ord 1001", "order ID is 1001" -> ORD-1001. Typed "CUST-001"/"ORD-1001"
  // never match (no whitespace after the prefix), so they pass through.
  out = out.replace(
    /\bcust(?:omer)?(?:\s+id)?(?:\s+is)?\s+0*(\d{1,3})\b/gi,
    (_, n: string) => ` CUST-${n.padStart(3, "0")} `
  );
  out = out.replace(
    /\bord(?:er)?(?:\s+id)?(?:\s+is)?\s+0*(\d+)\b/gi,
    (_, n: string) => ` ORD-${n} `
  );

  // Spoken email words -> symbols, but ONLY when an email is actually being
  // said (avoids mangling "look at ORD-1001"). "not" covers the recognizer
  // mishearing "dot" as "not" inside an address. Dot cleanups are deliberately
  // narrow (lowercase domain continuations only) so sentence periods like
  // "test. Refund" survive untouched.
  if (/@|at the rate|attherate/i.test(out)) {
    out = out
      .replace(/\bat\s+the\s+rate(?:\s+of)?\b/gi, "@")
      .replace(/\battherate\b/gi, "@")
      .replace(/\s+dot\s+/gi, ".")
      .replace(/\s+not\s+/gi, ".")
      .replace(/\s+underscore\s+/gi, "_")
      .replace(/\s+(?:dash|hyphen)\s+/gi, "-")
      .replace(/(\w)\s+@/g, "$1@") // "Nair @example" -> "Nair@example"
      .replace(/(\w)\s+(?=[\w.]*@)/g, "$1.") // "Priya Nair@" -> "Priya.Nair@"
      .replace(/(\w)\s+\.(?=[a-z])/g, "$1") // "example .test" -> "example.test"
      .replace(/\.(?=[a-z])\s+(?=[a-z]+$|[a-z]+\.)/g, ".") // "example. test" -> "example.test"
      .replace(/\s*@\s*/g, "@")
      .replace(/[\w.+-]+@[\w.-]+\.\w+/g, (m) => m.toLowerCase());
  }

  return out.trim().replace(/\s{2,}/g, " ");
}
