// LAYMAN: Scrubs emails (p***@…) and trims text before anything is logged, so private data never lands in the database (used by lib/logging/logger.ts).
// WHY: logs must never contain raw emails or model reasoning — only short summaries.
export function maskEmail(text: string): string {
  return text.replace(
    /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    "$1***@$2"
  );
}

export function summarize(text: string, max = 300): string {
  const masked = maskEmail(text);
  return masked.length > max ? masked.slice(0, max) + "…" : masked;
}
