"use client";

import { useEffect, useState } from "react";
import AgentLogs from "./AgentLogs";

// WHY: 5s polling (pausable) keeps the dashboard live without WebSockets.
export default function AdminDashboard() {
  const [tab, setTab] = useState<"logs" | "refunds" | "conversations">("logs");
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [refunds, setRefunds] = useState<Record<string, unknown>[]>([]);
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [paused, setPaused] = useState(false);
  const [fEvent, setFEvent] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCustomer, setFCustomer] = useState("");
  const [fRequest, setFRequest] = useState("");

  async function load() {
    const q = new URLSearchParams();
    if (fEvent) q.set("eventType", fEvent);
    if (fStatus) q.set("status", fStatus);
    if (fCustomer) q.set("customerId", fCustomer);
    if (fRequest) q.set("requestId", fRequest);
    q.set("limit", "100");
    const [l, r, c] = await Promise.all([
      fetch(`/api/admin/logs?${q}`).then((x) => x.json()).catch(() => ({ logs: [] })),
      fetch("/api/admin/refunds").then((x) => x.json()).catch(() => ({ refunds: [] })),
      fetch("/api/admin/conversations").then((x) => x.json()).catch(() => ({ conversations: [] })),
    ]);
    setLogs(l.logs ?? []);
    setRefunds(r.refunds ?? []);
    setConversations(c.conversations ?? []);
  }

  useEffect(() => {
    // Polling dashboard: initial + interval fetch. Direct fetch on mount is
    // intentional here (prototype admin, no external store).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    if (paused) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, tab]);

  const approved = refunds.filter((r) => r.decision === "approved").length;
  const denied = refunds.filter((r) => r.decision === "denied").length;
  const escalated = refunds.filter((r) => r.decision === "escalated").length;
  const errors = logs.filter((l) => l.status === "error").length;

  return (
    <div className="flex flex-col gap-4 text-zinc-900">
      <div className="flex gap-2 text-sm">
        <span className="rounded bg-green-100 px-2 py-1 text-green-900">Approved: {approved}</span>
        <span className="rounded bg-red-100 px-2 py-1 text-red-900">Denied: {denied}</span>
        <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900">Escalated: {escalated}</span>
        <span className="rounded bg-zinc-200 px-2 py-1 text-zinc-900">Errors: {errors}</span>
        <button className="ml-auto rounded border border-zinc-300 bg-white px-2 text-zinc-900" onClick={() => setPaused((p) => !p)} type="button">
          {paused ? "Resume polling" : "Pause polling"}
        </button>
      </div>
      <div className="flex gap-2">
        {(["logs", "refunds", "conversations"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} type="button"
            className={`rounded border border-zinc-300 px-3 py-1 text-sm ${tab === t ? "bg-black text-white" : "bg-white text-zinc-900"}`}>
            {t}
          </button>
        ))}
        <button onClick={load} type="button" className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900">Refresh</button>
      </div>
      {tab === "logs" && (
        <div className="flex flex-wrap gap-2 text-sm">
          <input className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400" placeholder="eventType" value={fEvent} onChange={(e) => setFEvent(e.target.value)} />
          <input className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400" placeholder="status" value={fStatus} onChange={(e) => setFStatus(e.target.value)} />
          <input className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400" placeholder="customerId" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
          <input className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 placeholder:text-zinc-400" placeholder="requestId" value={fRequest} onChange={(e) => setFRequest(e.target.value)} />
          <AgentLogs logs={logs} />
        </div>
      )}
      {tab === "refunds" && (
        <pre className="overflow-auto rounded border border-zinc-300 bg-white p-2 text-xs text-zinc-900">{JSON.stringify(refunds, null, 2)}</pre>
      )}
      {tab === "conversations" && (
        <pre className="overflow-auto rounded border border-zinc-300 bg-white p-2 text-xs text-zinc-900">{JSON.stringify(conversations, null, 2)}</pre>
      )}
    </div>
  );
}
