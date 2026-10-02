# MyLiquid: notes for Claude

Agentic wealth platform demo: Next.js 16 (App Router) + TypeScript + Tailwind v4 + SQLite (better-sqlite3). See README.md and docs/ARCHITECTURE.md.

## Commands
- `npm run check`: typecheck, lint and tests. Run it before committing.
- `npm run build`: production build.
- `npm run dev`: dev server. The DB is created and seeded at `.data/myliquid.db`; `npm run db:reset` re-seeds it.
- Deploying: `docs/DEPLOY.md` (Vercel + Turso, private with `MYLIQUID_SITE_PASSWORD`).

## Rules of the codebase
- Multi-user: every service function takes `(db, investorId, ...)`. Scope every query by `investor_id`, including lookups by id. Pages use `requireInvestor()`; API routes use `requireApiInvestor()` inside `handle(...)`.
- Money is integer cents everywhere in storage and services. Format only at the edges (`lib/domain/money.ts`).
- The database is a SQLite file locally and hosted libSQL (Turso) on Vercel (`TURSO_DATABASE_URL`). Use only `db.prepare/exec/transaction`; the wrapper in `lib/db/remote.ts` evens out the differences. Every statement is a round trip there, so batch large writes with `insertMany`. When you touch `lib/db` or SQL patterns, run `npm run test:libsql` against a local libSQL server.
- Money logic goes in `lib/domain` (pure, unit-tested). State changes go in `lib/services`. Never trade except via `executeOrder`, or `agentTrade` for agents.
- New agent capabilities are tools in `lib/agents/tools.ts` with a Zod schema. Set `trades: true` if they can move money. Never add a tool that withdraws cash, edits guardrails, releases the kill switch (wakes the pet), funds the agent wallet or edits the card policy. To expose a tool over MCP, add it to a scope in `lib/mcp/server.ts`.
- Standing orders (recurring investments, limit orders: `lib/services/automation.ts`) are the investor's own; they execute via `executeOrder` as "user" and agents may only read them (`get_standing_orders`).
- AINRA passports are verified only through `lib/ainra` (`checkPassport`, fail-closed). Every route that authenticates an API key must also call `identityGate` (see `/api/mcp`, x402).
- Identity decides autonomy for outside agents: they trade on their own only through `agentTrade`'s outside path (`autonomyDecision` in `lib/domain/agentTrading.ts`, fed by the gate's `OutsideTrader`); unidentified keys only propose. Stamp their orders and proposals with `agentKeyId`/`ainraNumber`. New columns go in `ADDED_COLUMNS` (in-place upgrade), not a schema version bump.
- Hosted traders (`lib/services/hostedTraders.ts`) act only like an outside agent: present the passport, pass `identityGate`, call MCP tools with `callMcpTool`, trade with `propose_trade`. Never let them call trading services directly. Strategies stay pure in `lib/domain/traderStrategies.ts`.
- Agent payments go through `payRequest` / `x402Purchase` (which use `attemptPayment` → `evaluatePayment`). Never debit a wallet directly.
- The pet (`lib/domain/companion.ts`, `lib/services/companion.ts`) earns XP only through `awardXp` for habits. Never award XP for trading volume.
- Offline mode must keep working: when you add a Claude-facing behavior, add the deterministic equivalent in `lib/agents/offline.ts`.
- Claude calls use the Anthropic TypeScript SDK (`client.beta.messages.stream`), default model `claude-opus-5`, adaptive thinking, `fallbacks: "default"`.
- UI colors come from CSS tokens in `src/app/globals.css` (light "paper & pixels" theme: ink `fg`, blue `accent`, lime `accent-2`, LCD tokens for the pet). Sleeve colors are a validated categorical palette, so don't reorder them. Fonts: `font-display` for headings, `font-pixel` for pixel labels.
- The pet is a Tamagotchi (`components/pet`: `PixelPet`, `TamaDevice`, `PetRoom`); keep that look. The brand logo is the separate living orb in `components/brand/LogoMark.tsx`.
- Phones: MyLiquid is an installable web app (`src/app/manifest.ts`, `public/sw.js`) and an Android Trusted Web Activity (`android/`, built by `.github/workflows/android.yml`); see `docs/MOBILE.md`. The service worker never caches pages or API responses. Anything public behind the site password (data-free app-shell files) goes in `isPublicPath` (`lib/auth/siteGate.ts`). On phones the app uses the bottom tab bar (`MobileTabBar`) and pads for `env(safe-area-inset-*)`. Never commit a signing key.
- Avoid `Intl` compact number formatting in anything rendered on both server and client (it causes hydration mismatches). Use `formatUsd(..., { compact: true })`.
