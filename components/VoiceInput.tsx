"use client";

import { useEffect, useRef, useState } from "react";

function recognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// WHY: mic is just another producer of text — the transcript goes through the
// same sendMessage(text) as typed input, so chat and voice share one pipeline.
export default function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => recognitionCtor() !== null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const finalsRef = useRef("");

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Voice input needs Chrome or Edge.");
      return;
    }
    setError(null);
    setInterim("");
    finalsRef.current = "";
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalsRef.current += r[0].transcript + " ";
        else setInterim(r[0].transcript);
      }
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Mic blocked — allow microphone access in the browser and retry."
          : `Mic error: ${e.error}`
      );
      setListening(false);
    };
    // Single send per utterance: flush accumulated finals when speech ends.
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalsRef.current.trim();
      finalsRef.current = "";
      if (text) onTranscript(text);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
    }
  }

  if (!supported) {
    return <p className="text-xs text-zinc-500">Voice input needs Chrome or Edge.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled && !listening}
        aria-label={listening ? "Stop recording" : "Start voice input"}
        className={`rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
          listening ? "bg-red-600" : "bg-zinc-700"
        }`}
      >
        {listening ? "Stop" : "Mic"}
      </button>
      {listening && (
        <span className="text-xs text-red-700" aria-live="polite">
          Listening… {interim}
        </span>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
