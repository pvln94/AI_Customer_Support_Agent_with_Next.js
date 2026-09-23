// The chat window itself — typing box, message bubbles, Mic button, spoken replies; every message you send goes through one sendMessage() function (shown by app/page.tsx).
"use client";

import { useEffect, useState } from "react";
import { sendChat } from "@/lib/api-client";
import RefundStatus from "./RefundStatus";
import DemoScenarios from "./DemoScenarios";
import VoiceInput from "./VoiceInput";
import type { RefundSummary } from "@/types";

interface Msg {
  from: "user" | "assistant";
  text: string;
  refund?: RefundSummary;
}

// WHY: Stage 2 voice will reuse this — ALL sending goes through sendMessage(text).
export default function ChatInterface() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "assistant", text: "Hi! I can help with order refunds. Please share your customer ID and email to start." },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserText, setLastUserText] = useState<string>("");
  const [voiceReplies, setVoiceReplies] = useState(true);

  // WHY: spoken replies reuse the same reply text — voice is a presentation
  // layer over the identical agent pipeline, not a second agent.
  function speak(text: string) {
    if (!voiceReplies || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  }

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (trimmed.length > 1000) {
      setError("Message is limited to 1000 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // stop any in-progress reply
    }
    setLastUserText(trimmed);
    setMessages((m) => [...m, { from: "user", text: trimmed }]);
    setInput("");
    try {
      const res = await sendChat(conversationId, trimmed);
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { from: "assistant", text: res.reply, refund: res.refund }]);
      speak(res.reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    if (lastUserText) sendMessage(lastUserText);
  }

  return (
    <div className="flex flex-col gap-4">
      <DemoScenarios onFill={(t) => setInput(t)} />
      <div aria-live="polite" className="flex min-h-64 flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "user" ? "self-end bg-blue-600 text-white" : "self-start border border-zinc-200 bg-zinc-100 text-zinc-900"} style={{ borderRadius: 8, padding: "6px 10px", maxWidth: "85%" }}>
            <p className="text-sm">{m.text}</p>
            {m.refund && (
              <div className="mt-1">
                <RefundStatus refund={m.refund} />
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-zinc-500">Agent is typing…</p>}
      </div>
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          <span>{error}</span>{" "}
          <button className="underline" onClick={retry} type="button">
            Retry
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Type your message (Enter to send)"
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          Send
        </button>
        <VoiceInput onTranscript={(t) => sendMessage(t)} disabled={loading} />
      </form>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={voiceReplies}
          onChange={(e) => {
            setVoiceReplies(e.target.checked);
            if (!e.target.checked && typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          }}
        />
        Speak agent replies aloud
      </label>
    </div>
  );
}
