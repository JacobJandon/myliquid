# MyLiquid: notes for Claude

Agentic wealth platform demo: Next.js 16 (App Router) + TypeScript + Tailwind v4 + SQLite (better-sqlite3). See README.md and docs/ARCHITECTURE.md.

## Commands
- `npm run check`: typecheck, lint and tests. Run it before committing.
- `npm run build`: production build.
- `npm run dev`: dev server. The DB is created and seeded at `.data/myliquid.db`; `npm run db:reset` re-seeds it.

## Rules of the codebase
- Multi-user: every service function takes `(db, investorId, ...)`. Scope every query by `investor_id`, including lookups by id. Pages use `requireInvestor()`; API routes use `requireApiInvestor()` inside `handle(...)`.
- Money is integer cents everywhere in storage and services. Format only at the edges (`lib/domain/money.ts`).
- Money logic goes in `lib/domain` (pure, unit-tested). State changes go in `lib/services`. Never trade except via `executeOrder`, or `agentTrade` for agents.
- New agent capabilities are tools in `lib/agents/tools.ts` with a Zod schema. Set `trades: true` if they can move money. Never add a tool that withdraws cash, edits guardrails, releases the kill switch (wakes the pet), funds the agent wallet or edits the card policy. To expose a tool over MCP, add it to a scope in `lib/mcp/server.ts`.
- Agent payments go through `payRequest` / `x402Purchase` (which use `attemptPayment` → `evaluatePayment`). Never debit a wallet directly.
- The pet (`lib/domain/companion.ts`, `lib/services/companion.ts`) earns XP only through `awardXp` for habits. Never award XP for trading volume.
- Offline mode must keep working: when you add a Claude-facing behavior, add the deterministic equivalent in `lib/agents/offline.ts`.
- Claude calls use the Anthropic TypeScript SDK (`client.beta.messages.stream`), default model `claude-opus-5`, adaptive thinking, `fallbacks: "default"`.
- UI colors come from CSS tokens in `src/app/globals.css` (light "paper & pixels" theme: ink `fg`, blue `accent`, lime `accent-2`, LCD tokens for the pet). Sleeve colors are a validated categorical palette, so don't reorder them. Fonts: `font-display` for headings, `font-pixel` for pixel labels.
- Avoid `Intl` compact number formatting in anything rendered on both server and client (it causes hydration mismatches). Use `formatUsd(..., { compact: true })`.
