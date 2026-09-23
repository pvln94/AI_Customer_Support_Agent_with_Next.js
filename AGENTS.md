<!-- House rules for anyone (or any AI) editing this project — the architecture decisions that must not be broken, plus Next.js version notes. -->
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Refund Agent — architecture rules (do not break)

- LLM is the conversation layer; deterministic code is the decision layer. The LLM can NEVER approve. Only `submitRefundRequest` decides, re-validating policy from fresh DB data.
- Rules live in `lib/refund/policy.ts` (pure, injectable clock), not the prompt. Prompt injection must fail by design.
- Exactly 6 tools in `lib/tools/*` + `registry.ts`. No approve/deny tools. Only `identifyCustomer` takes a customer ID; others use server `ToolContext.verifiedCustomerId`.
- Every tool returns `{ ok:true, data }` or `{ ok:false, error:{code,message,retryable} }` + `customerFacingSummary`.
- Refunds SIMULATED (`simulated_processed`). Never claim money moved.
- Store only user/assistant text in conversations; mask emails in logs; never log reasoning.
- Refund object in chat responses comes from tool results, never LLM text (truthfulness guard in `lib/agent/`).
- Admin (`/admin`, `/api/admin/*`) behind Basic Auth in `proxy.ts` (Next 16 convention).
- Chat sending goes through ONE function `sendMessage(text)` — voice transcripts reuse it, so chat and voice share one pipeline.
- Voice uses the free browser Web Speech API (`components/VoiceInput.tsx` mic in, `speechSynthesis` replies out). Spoken words are normalized to symbols/IDs in `lib/voice/normalize.ts` (voice-only; typed input untouched). No voice vendor SDKs; no extra API keys.
- Next 16: route params are `Promise` (`{ params: Promise<{…}> }` + `await params`); proxy file is `proxy.ts`.
