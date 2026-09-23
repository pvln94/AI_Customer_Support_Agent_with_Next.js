<!-- Build diary — the plan, milestones and what was verified working at each step. -->
# PROGRESS.md — AI Customer Support Agent (Refund Agent, Stage 1)

Env (verified 2026-09-21):
- Node v22.14.0, npm 11.2.0 (Windows 11, PowerShell)
- MongoDB reachable at 127.0.0.1:27017 (Test-NetConnection TcpTestSucceeded=True)
- Next.js 16.3.5 (proxy.ts convention, route params are Promise), React 19
- Scaffolded via `./scaffold-tmp` (root folder name invalid as npm name), moved to root, renamed to `refund-agent`.

Milestones (all done):
- [x] Scaffold + deps (mongoose, zod, openai, tsx, vitest, vite-tsconfig-paths, mongodb-memory-server, vite)
- [x] Env (.env.example, .env.local, .gitignore with !.env.example)
- [x] DB + models (5 collections, partial unique index, toJSON, cached promise)
- [x] Policy engine + 9 unit tests
- [x] Seed (15 customers, 25 orders, idempotent, warning-free)
- [x] 6 tools + registry (5s timeout, SIMULATE_FAILURE)
- [x] LLM adapter (LLMProvider interface, OpenAI-compatible, model from env)
- [x] Agent loop (max 6, retries, truthfulness guard, observable-events logging)
- [x] POST /api/chat (zod 1-1000 chars, 20/min/IP, force-dynamic)
- [x] Chat UI (single sendMessage(text), aria-live, badge, demo scenarios)
- [x] Admin routes (7) + dashboard (stats, tabs, filters, 5s pausable polling)
- [x] Integration (4) + agent (5) tests
- [x] README, AGENTS.md (kept Next.js block, fixed params convention)

Verification (ran, saw output):
- npx tsc --noEmit: PASS
- npm run lint: PASS
- npm run test (18 tests: 9 unit + 4 integration + 5 agent): PASS
- npm run seed: PASS (15 customers, 25 orders; duplicate-index warning fixed)
- npm run build: PASS (all 11 routes + proxy)
- Smoke on `next start -p 3101`: /api/admin/logs no-auth=401, POST /api/chat {}=400. PASS
- Live LLM chat NOT verified (no LLM_API_KEY in .env.local). Verify: fill .env.local, npm run dev, chat as CUST-001.
- Browser UI NOT verified (no browser run). Verify: npm run dev, open http://localhost:3000 and /admin.
