# MyLiquid

**The agentic wealth platform that is honest about liquidity.**

MyLiquid is a web platform where a desk of AI agents researches, trades and guards
one portfolio across five sleeves: **index funds, active trading, bitcoin, business
interests, and private equity & credit**. Every product carries its real liquidity
terms. A liquidity ladder shows, every day, how much of your money could actually
be cash, and when.

The idea started from the Windhorst/H2O "shadow banking bridge": liquid retail money
funnelled into illiquid, self-marked private bonds. MyLiquid is the opposite:
lock-ups and gates are stated up front, no originator may exceed 5% of a portfolio,
private assets are valued by an independent appraiser, and an agent rejects
circular or related-party deals. The design also draws on how Robinhood, Public,
Webull, eToro, Gemini and Coinbase opened up to AI agents in 2026. See
[`docs/research/agentic-finance-landscape.md`](docs/research/agentic-finance-landscape.md).

> Demo software: simulated markets, fictional products, demo money. Not investment advice.

## The agent desk

| Agent | Role | Can't |
|---|---|---|
| **Atlas** | Portfolio strategist: allocation vs target, rebalance proposals | Sell locked positions, skip Sentinel |
| **Quant** | Trading & execution: trend signals, autopilot rules | Trade outside the mandate or while paused |
| **Scout** | Private-market diligence: red-flag checklist, deal memos | Approve circular or related-party deals |
| **Ledger** | Independent valuation: stale, self-marked or too-smooth marks | Change a valuation |
| **Sentinel** | Risk & liquidity: pre-trade checks, liquidity ladder, kill switch | Release the kill switch, trade |
| **Copilot** | Chat front door that uses the specialists' tools | Withdraw money, change guardrails |

Agents run on **Claude** (Anthropic API) when `ANTHROPIC_API_KEY` is set. Without a
key they run in a deterministic **offline mode** that calls exactly the same tools,
so the whole platform works out of the box.

### Guardrails

- **Propose-only by default.** Agent trades become proposals in your approval
  inbox. *Bounded autonomy* is opt-in: small trades within a mandate (auto-execute
  limit, per-order and daily caps, agent budget, sleeve whitelist, order rate limit)
  execute on their own.
- **Sentinel pre-trade checks** run on every order, whether it comes from you, an
  agent, an autopilot rule or the API. They cover KYC, lock-ups, cash, minimums,
  illiquid share, bitcoin cap, single-deal concentration, cash buffer and Scout's
  verdict.
- **Kill switch.** It pauses Atlas, Quant and autopilot. A circuit breaker pulls
  it on a sharp daily drop. Agents can pull it, but only you can release it.
- **Human-only withdrawals.** No agent tool can move money off the platform.
- **Append-only audit log** of every run, tool call, proposal, alert and blocked order.

## Quick start

Requires Node.js 22.12+.

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY to use Claude
npm run dev                  # http://localhost:3000
```

The first request creates `.data/myliquid.db` (SQLite) and seeds a demo investor
with a year of simulated market history.

Things to try:

1. **Agent desk → Run desk cycle.** Ledger flags the self-marked shipyard bond,
   Scout rejects it, Sentinel checks limits, Atlas proposes a rebalance and Quant
   reads signals.
2. **Overview → Approval inbox.** Approve the rebalance.
3. **Invest → Nordhavn Shipyard Bond.** Try to buy it. The trade is blocked.
4. **Copilot.** Ask *"How liquid am I?"* or *"If bitcoin falls 20% from its high,
   buy $1,000"*.
5. **Advance market (+1d / +7d / +30d).** Watch settlements, appraisals, quarterly
   redemption gates and autopilot rules fire.
6. **Guardrails.** Change the risk profile, switch to bounded autonomy, or pull
   the kill switch.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit and integration tests (Vitest, in-memory SQLite) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint (Next.js config) |
| `npm run check` | Typecheck, lint and test |
| `npm run db:reset` | Wipe and re-seed the local database |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (none) | Enables Claude-powered agents. Without it, agents run offline |
| `MYLIQUID_MODEL` | `claude-opus-5` | Model used by the agents |
| `MYLIQUID_EFFORT` | `medium` | Reasoning effort (`low` … `max`) |
| `MYLIQUID_AGENT_MODE` | auto | Force `offline` or `claude` |
| `MYLIQUID_DB_PATH` | `.data/myliquid.db` | SQLite file location |
| `MYLIQUID_SIM_START` | today | Market date to seed from (YYYY-MM-DD) |

Claude requests use adaptive thinking, streaming, prompt caching on the system
prompt, and server-side refusal fallbacks (`fallbacks: "default"`).

## Docker

```bash
docker build -t myliquid .
docker run -p 3000:3000 -v myliquid-data:/data -e ANTHROPIC_API_KEY=... myliquid
```

## Project layout

```
src/
  app/                 Next.js App Router: landing page, /app/* pages, /api/* routes
  components/          UI kit, charts, client components (desk, copilot, inbox…)
  lib/
    domain/            Pure logic: catalog, market sim, liquidity, risk, valuation, diligence, rebalance, signals
    db/                SQLite schema, seed, connection
    services/          Portfolio, orders & settlement, proposals, alerts, audit log, rules, market clock
    agents/            Agent registry, tools, Claude loop, offline agents, runner
docs/
  research/            Agentic-finance landscape research (Sept 2026)
  ARCHITECTURE.md      How the pieces fit together
```

More detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Roadmap

- Real authentication and multi-investor accounts (data is already keyed by investor)
- **Bring your own agent:** an MCP server with scoped read/trade keys behind the same
  guardrails, following Robinhood, Webull, Gemini and Coinbase
- Live market data adapters in place of the simulation
- Scheduled desk cycles and push notifications per agent trade
- Agentic payment rails (x402, Visa Intelligent Commerce, Mastercard Agent Pay) for funding
- Design pass (phase 2: "make it beautiful")
