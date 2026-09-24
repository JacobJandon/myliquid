# MyLiquid

**Hatch an agent that invests, pays and grows with you.**

MyLiquid is an agentic wealth platform. Every account comes with **its own living
agent**, a Tamagotchi-style pixel pet you name at sign-up. It runs a desk of
specialist AI agents that research, trade and guard one portfolio across five
sleeves: **index funds, active trading, bitcoin, business interests, and private
equity & credit**. It also carries an **agent card**, so it can tap to pay at shop
terminals and pay per call for premium data, within the rules you set.

Every product carries its real liquidity terms, and a liquidity ladder shows every
day how much of your money could actually be cash, and when.

The idea started from the Windhorst/H2O "shadow banking bridge": liquid retail money
funnelled into illiquid, self-marked private bonds. MyLiquid is the opposite:
lock-ups and gates are stated up front, no originator may exceed 5% of a portfolio,
private assets are valued by an independent appraiser, and an agent rejects
circular or related-party deals. The design also draws on how Robinhood, Public,
Webull, eToro, Gemini and Coinbase opened up to AI agents in 2026. See
[`docs/research/agentic-finance-landscape.md`](docs/research/agentic-finance-landscape.md).
The pet, Agent Pay and the design draw on agentic-token card programs, x402, AI
companions and YC-era product sites. See
[`docs/research/agent-pay-and-companions.md`](docs/research/agent-pay-and-companions.md).

> Demo software: simulated markets, fictional products and merchants, demo money. No
> real cards or payments. Not investment advice.

## Your agent (it's alive)

- **Hatch it.** Sign-up starts with naming your agent and picking its shell colour.
  Guests get one too, named Drip.
- **Vitals change in real time.** Fullness, energy and joy move on their own. Its
  mood also reflects your portfolio: open risk alerts or a book that is mostly
  locked up make it anxious.
- **Care actions have a point.**
  - *Feed* gives it a research snack: one true fact about your portfolio.
  - *Play* is a liquidity quiz.
  - *Talk* opens the chat, where the pet answers with live tool calls.
  - *Put to sleep* is the kill switch. Every agent stops, and only you can wake it.
- **It evolves:** Drop → Droplet → Splash → Wave → Tide over ten levels. XP comes
  only from habits: daily check-ins, deciding proposals, reviewing alerts, three
  daily quests, and a little from work the desk does. Each habit has a daily cap.
  Trading more never earns XP.

## Agent Pay

- **Agent card.** The pet carries a tokenized agent card, so it never sees a card
  number. It spends from an **agent wallet** that only you can fund, from your
  cash and up to $5,000. The wallet is the hard ceiling.
- **Spending policy.** Every payment is checked against a policy you edit:
  - *Hard rules* decline: card frozen, blocked category, per-payment, daily or
    monthly limit, or not enough in the wallet.
  - *Soft rules* ask you first: above your auto-pay line, a new merchant above
    $25, a burst of payments, or the pet is asleep. Approve or decline under
    **Agent Pay → Waiting for your OK**.
- **Terminals.** `/terminal` is a public merchant POS demo. Ring up a sale and it
  shows a short `LQ-XXXX` code (a stand-in for NFC). Pay it from
  **Agent Pay → Tap to pay**, from chat (*"pay LQ-XXXX"*) or over MCP. The terminal
  updates live: approved, waiting for owner, or declined.
- **Pay-per-call data (x402-style).** `GET /api/x402/research/{dealId}` answers
  `402 Payment Required` with machine-readable requirements. Retry with a
  pay-scoped key and `X-PAYMENT: myliquid-wallet`, and the wallet pays 50¢ under
  the same policy and the diligence data comes back. Scout can buy it from
  **Agent Pay** too.

## The agent desk

| Agent | Role | Can't |
|---|---|---|
| **Atlas** | Portfolio strategist: allocation vs target, rebalance proposals | Sell locked positions, skip Sentinel |
| **Quant** | Trading & execution: trend signals, autopilot rules | Trade outside the mandate or while paused |
| **Scout** | Private-market diligence: red-flag checklist, deal memos | Approve circular or related-party deals |
| **Ledger** | Independent valuation: stale, self-marked or too-smooth marks | Change a valuation |
| **Sentinel** | Risk & liquidity: pre-trade checks, liquidity ladder, kill switch | Release the kill switch, trade |
| **Your pet** (Copilot) | Your own agent: chat, runs the desk, pays with its agent card | Withdraw money, change guardrails or card limits, fund its wallet |
| **Your agent** | Any MCP client you connect with an API key (for example Claude) | Withdraw money, change guardrails, trade with a read-only key |

Agents run on **Claude** (Anthropic API) when `ANTHROPIC_API_KEY` is set. Without a
key they run in a deterministic **offline mode** that calls exactly the same tools,
so the whole platform works out of the box.

### Bring your own agent (MCP)

Like Robinhood, Webull, Gemini and Coinbase, MyLiquid exposes its tools over the
**Model Context Protocol**. Create a key under **Connect an agent**. A *read* key
sees your portfolio, liquidity, deals, signals, risk, wallet and nearby terminals. A
*trade* key can also propose trades, rebalances and autopilot rules. A *pay* key
can pay terminal codes and buy premium data from the agent wallet, under the card
policy. Then point any MCP client at `/api/mcp`:

```bash
claude mcp add --transport http myliquid https://<your-host>/api/mcp \
  --header "Authorization: Bearer mlk_..."
```

Connected agents get the same guardrails as the desk: Sentinel's checks, your
autonomy setting, the mandate and the kill switch. They are rate-limited, and
every call is recorded in your audit log.

### Guardrails

- **Propose-only by default.** Agent trades become proposals in your approval
  inbox. *Bounded autonomy* is opt-in: small trades within a mandate (auto-execute
  limit, per-order and daily caps, agent budget, sleeve whitelist, order rate limit)
  execute on their own.
- **Sentinel pre-trade checks** run on every order, whether it comes from you, an
  agent, an autopilot rule or the API. They cover KYC, lock-ups, cash, minimums,
  illiquid share, bitcoin cap, single-deal concentration, cash buffer and Scout's
  verdict.
- **Kill switch** (or put your pet to sleep). It pauses Atlas, Quant and autopilot.
  Agent tools can't start payments while it is on, and any other payment (a tap
  you start, an x402 call) waits for your approval. A circuit breaker pulls it on a
  sharp daily drop. Agents can pull it, but only you can release it.
- **Human-only withdrawals.** No agent tool can withdraw cash, fund the agent
  wallet or change the card policy. Agents spend only what you put in the wallet.
- **Append-only audit log** of every run, tool call, proposal, alert and blocked order.

## Quick start

Requires Node.js 22.12+.

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY to use Claude
npm run dev                  # http://localhost:3000
```

The first request creates `.data/myliquid.db` (SQLite) and seeds a year of
simulated market history.

On the landing page, **Try the live demo** opens a private guest account, with a
year-old sample portfolio and its own pet, in one click. You can save it later by
creating an account. **Hatch your agent** starts sign-up: name your pet and pick
its colour, answer three risk questions (they set your profile and hard limits),
and start with $100,000 of demo cash or the sample portfolio.

Things to try:

1. **Home.** Your pet checks in when you visit. Press *Feed*, then *Play* the
   liquidity quiz, and watch the XP and quests.
2. **Agent Pay.** Top up the wallet. Open `/terminal` in another tab, charge a
   coffee, and tap the code. Then charge the $64 grocery run and approve it from
   *Waiting for your OK*. Buy a premium report for 50¢.
3. **Agent desk → Run desk cycle.** Ledger flags the self-marked shipyard bond,
   Scout rejects it, Sentinel checks limits, Atlas proposes a rebalance and Quant
   reads signals.
4. **Home → Approval inbox.** Approve the rebalance.
5. **Invest → Nordhavn Shipyard Bond.** Try to buy it. The trade is blocked.
6. **Talk.** Ask your pet *"How liquid am I?"*, *"What's in my wallet?"* or
   *"If bitcoin falls 20% from its high, buy $1,000"*.
7. **Advance market (+1d / +7d / +30d).** Watch settlements, appraisals, quarterly
   redemption gates and autopilot rules fire.
8. **Guardrails.** Change the risk profile, switch to bounded autonomy, or pull
   the kill switch (or just put your pet to sleep).
9. **Connect an agent.** Create a trade or pay key, connect Claude (or run the
   curl snippet), and watch its proposal land in your inbox or its payment reach
   the terminal.

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
| `MYLIQUID_MARKET_CLOCK` | auto | `manual` stops the market from catching up to today's date |
| `MYLIQUID_COOKIE_SECURE` | `true` in production | Set `false` to serve over plain HTTP (e.g. Docker on a LAN IP) |

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
  components/          UI kit, charts, pet (pixel sprite, device, room), pay (card, POS terminal, panels), app components
  lib/
    domain/            Pure logic: catalog, market sim, liquidity, risk, valuation, diligence, rebalance, signals,
                       companion (vitals, XP, quests), payments (merchants, card policy)
    db/                SQLite schema, seed, connection
    services/          Investors, portfolio, orders & settlement, proposals, alerts, audit log, rules, API keys,
                       market clock, companion (the pet), payments (wallet, card, terminals, x402)
    agents/            Agent registry, tools, Claude loop, offline agents, runner
    auth/              Password hashing (scrypt), sessions, cookies
    mcp/               MCP server (official SDK, stateless Streamable HTTP)
docs/
  research/            Agentic-finance landscape; agent payments, AI companions and design (Sept 2026)
  ARCHITECTURE.md      How the pieces fit together
```

More detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Roadmap

- Email verification, password reset and passkeys
- OAuth for MCP clients (in place of pasted API keys)
- Live market data and a broker adapter in place of the simulation
- Real agent cards through a licensed issuer on an agentic-token program
  (Mastercard Agent Pay, Visa Intelligent Commerce), and real x402 settlement
- NFC/QR tap-to-pay from a phone in place of typed terminal codes
- Scheduled desk cycles and push notifications (for example, "your pet is hungry",
  or a payment waiting for approval)
