"use client";

// WHY: color-coded timeline makes retries/errors visible without reading raw JSON.
export default function AgentLogs({ logs }: { logs: Record<string, unknown>[] }) {
  return (
    <div className="flex flex-col gap-1 text-zinc-900">
      {logs.map((l, i) => {
        const status = l.status as string;
        const cls =
          status === "error"
            ? "bg-red-50 border-red-300"
            : (l.eventType as string) === "retry"
              ? "bg-yellow-50 border-yellow-300"
              : "bg-white border-zinc-300";
        return (
          <details key={i} className={`rounded border p-2 text-xs ${cls}`}>
            <summary className="cursor-pointer">
              {(l.timestamp as string)?.slice(0, 19).replace("T", " ")} · {l.eventType as string} ·{" "}
              {status} · {(l.requestId as string) ?? ""} {l.toolName ? `· ${l.toolName as string}` : ""}
            </summary>
            <pre className="mt-1 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(l, null, 2)}
            </pre>
          </details>
        );
      })}
      {!logs.length && <p className="text-sm text-zinc-500">No logs yet.</p>}
    </div>
  );
}
