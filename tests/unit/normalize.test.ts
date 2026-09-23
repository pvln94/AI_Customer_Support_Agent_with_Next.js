// LAYMAN: Automated checks that spoken words ("at the rate", "001") become proper emails/IDs and typed text is untouched; run with `npm run test:unit`.
import { describe, it, expect } from "vitest";
import { normalizeSpokenInput } from "@/lib/voice/normalize";

describe("voice normalization", () => {
  it("converts spoken email words to symbols", () => {
    expect(
      normalizeSpokenInput("Priya dot Nair at the rate example dot test")
    ).toBe("priya.nair@example.test");
  });
  it("repairs misheard dot (not) inside addresses", () => {
    expect(normalizeSpokenInput("mail ID is Priya Nair at the rate example not test")).toContain(
      "priya.nair@example.test"
    );
  });
  it("converts spoken customer and order IDs", () => {
    expect(normalizeSpokenInput("customer ID is 001")).toContain("CUST-001");
    expect(normalizeSpokenInput("cust 15")).toContain("CUST-015");
    expect(normalizeSpokenInput("order ID is 1001")).toContain("ORD-1001");
  });
  it("leaves typed input untouched", () => {
    expect(normalizeSpokenInput("CUST-001, priya.nair@example.test. Refund ORD-1001.")).toBe(
      "CUST-001, priya.nair@example.test. Refund ORD-1001."
    );
  });
});
