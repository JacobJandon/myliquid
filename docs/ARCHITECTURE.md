# Architecture

MyLiquid is a single Next.js 16 app (App Router, TypeScript, Tailwind v4) with a
SQLite database. It is multi-user: every portfolio, order, proposal, alert, rule,
chat and audit event belongs to one investor. The simulated market (prices and
Scout's deal reviews) is shared. The code is layered so the rules that matter for money live in
pure, tested functions, and everything above them (agents, API, UI) goes through
the same service layer.

```
 Browser (React)                 Claude (Anthropic API)
   │  fetch / NDJSON stream            ▲  streaming tool-use loop
   ▼                                   │
 app/api/* route handlers ──► lib/agents (registry · tools · llm · offline · runner)
   │                                   │
   └──────────────► lib/services ◄─────┘     orders, proposals, alerts, audit, rules, sim
                        │
                        ▼
                    lib/domain  (pure)       catalog, market, liquidity, risk, valuation,
                        │                    diligence, rebalance, signals
                        ▼
                    lib/db (better-sqlite3)  schema, seed
```

## Accounts, sessions and connected agents

- `lib/auth`: scrypt password hashes and random session tokens. Only a SHA-256
  of each token is stored, in an httpOnly, SameSite=Lax cookie (`ml_session`).
  Pages call `requireInvestor()` (which redirects to `/login`). Route handlers call
  `requireApiInvestor()` (which returns 401). Mutating API requests with a foreign
  `Origin` are rejected.
- `services/investors.ts`: creates accounts with a starter (sample portfolio
  backfilled from market history, or $100k of cash). It also upgrades guests to
  users, resets or deletes accounts, and prunes guests older than 7 days.
- `services/apiKeys.ts` and `lib/mcp/server.ts`: scoped keys (`mlk_…`, stored
  hashed, shown once) and a stateless Streamable HTTP MCP server built on the
  official SDK. Tools are the same `AgentTool`s the desk uses, filtered by scope
  and run as the `external` agent. Requests are rate-limited per key.
- `services/sim.ts`: one market clock for everyone. `ensureMarketCurrent` catches
  the market up to the real date on each app or MCP request. Each simulated day
  settles, gates, records NAV, checks circuit breakers and runs autopilot rules
  for every investor.

## Layers

**`lib/domain`: pure functions, no I/O.**
- `catalog.ts`: the product shelf (13 fictional products) and deal facts.
- `market.ts`: deterministic simulation. Prices come from a hash of
  `(product, date)`, so history can always be rebuilt. Market products follow
  geometric Brownian motion with a common factor. Private products only move on
  appraisal dates.
- `liquidity.ts`: the liquidity ladder (settlement, notice, quarterly windows,
  lock-ups).
- `risk.ts`: Sentinel's pre-trade checks and portfolio review, plus the mandate
  checks that apply only to autonomous agent orders.
- `valuation.ts`: Ledger's checks (stale > 35 days, originator-marked,
  too-smooth returns).
- `diligence.ts`: Scout's red-flag scoring and memo.
- `rebalance.ts`: Atlas's plan. It never sells locked sleeves and funds liquid
  sleeves first.
- `signals.ts`: Quant's momentum signal and the autopilot rule engine.

**`lib/services`: stateful operations on SQLite.**
- `orders.ts`: `previewOrder` and `executeOrder`, the only way to trade. Blocked
  orders are stored as `rejected` for the audit trail. Deposits and withdrawals
  are here too (withdrawals are human-only).
- `proposals.ts`: `agentTrade` is the single entry point for agents. It either
  executes within the mandate (bounded autonomy), creates a proposal, or reports
  a block. `approveProposal` re-checks every order at approval time.
- `sim.ts`: the market clock. Each day it moves prices, settles sales and
  withdrawals, runs quarterly redemption windows with gates (pro-rated, remainder
  rolls over), records NAV, trips the circuit breaker, and lets Quant evaluate
  autopilot rules.
- `alerts.ts`, `audit.ts`, `rules.ts`, `deals.ts`, `portfolio.ts`, `repo.ts`.

**`lib/agents`: the desk.**
- `registry.ts`: agent definitions (role, allowed tools, routine prompt, limits)
  and the shared system prompt.
- `tools.ts`: every capability is a tool with a Zod schema. `invokeTool` validates
  input, refuses trading tools while the kill switch is on, and runs the tool. The
  JSON schema sent to Claude is generated from the same Zod schema.
- `llm.ts`: a manual streaming tool-use loop on `client.beta.messages.stream`
  (adaptive thinking, `eager_input_streaming` tools validated with Zod before
  running, `fallbacks: "default"` for refusals, cached system prompt, refusal and
  `max_tokens` handling).
- `offline.ts`: deterministic routines and an intent-routing Copilot that call
  the same tools.
- `runner.ts`: runs routines and the desk cycle (Ledger → Scout → Sentinel →
  Atlas → Quant). It falls back to offline if Claude is unreachable, and stores
  the Copilot conversation append-only (full API content blocks) so it can be
  replayed.

**`app/`: UI and API.** Pages are server components that read through the
services. Interactive pieces are client components that call `/api/*` and then
`router.refresh()`. Agent runs and chat stream back as NDJSON `DeskEvent`s, so you
watch tool calls happen live.

## Invariants

1. Every order goes through `executeOrder`, which runs `runPreTradeChecks`.
2. Agents trade only through `agentTrade`. Autonomy requires `autonomy = bounded`,
   the order within the auto-execute limit, and every mandate check passing.
3. No agent tool can withdraw cash, change settings or release the kill switch.
4. Rejected deals can never be bought, whether by a person or an agent.
5. Locked lots can never be sold before `locked_until`.
6. The audit log (`agent_events`) is append-only.
7. Every service call is scoped by `investorId`. Lookups by id (orders,
   proposals, alerts, rules, keys) always also match the investor, so one user can
   never act on another's records.
8. Session cookies can reach cash, settings and account deletion. API keys can
   only reach the MCP tool list for their scope.

## Tests

`npm test` runs Vitest against in-memory SQLite:

- `domain.test.ts`: dates, market determinism, ladder, checks, diligence,
  valuation, rebalance, rules.
- `services.test.ts`: settlement, lock-ups, queued redemptions, cash, proposals,
  bounded autonomy, kill switch, autopilot.
- `agents.test.ts`: tool schemas, trading guard, a full offline desk cycle, the
  Copilot router.
- `claude-loop.test.ts`: the Claude loop against a local mock of the Messages
  streaming API. It checks request shape (model, adaptive thinking, fallbacks,
  eager tool streaming), the tool-result round trip and transcript storage.
- `services.test.ts` (accounts): investor isolation, passwords, sessions, guest
  upgrade, reset and delete, API keys.
- `mcp.test.ts`: drives the real `/api/mcp` route with JSON-RPC. It covers auth,
  origin checks, scope filtering, read tools, and trade proposals from an external
  agent (including the blocked shipyard bond).
