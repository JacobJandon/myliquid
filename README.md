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

The logo is a living drop of liquid with eyes. It slowly morphs, breathes and blinks
(`components/brand/LogoMark.tsx`, with a static `app/icon.svg` for the browser tab).

> Demo software: simulated markets, fictional products and merchants, demo money. No
> real cards or payments. Not investment advice.

## Your agent (it's alive)

- **Hatch it.** Sign-up starts with naming your agent and picking its shell colour.
  Guests get one too, named Drip.
- **Vitals change in real time.** Fullness, energy and joy move on their own. Its
  mood also reflects your portfolio: open risk alerts or a book that is mostly
  locked up make it anxious.
- **Care actions have a point.**
  - *Feed* gives it a research snack: a different true fact about your portfolio
    each time, such as the day's change, 7-day liquidity, the biggest position,
    lock-ups, or what's waiting for your OK.
  - *Play* is a quiz about your own portfolio: 7-day liquidity, cash share or
    biggest position. It explains the answer, which stays on the server.
  - *Talk* opens the chat, where the pet answers with live tool calls.
  - *Put to sleep* is the kill switch. Every agent stops, and only you can wake it.
- **It reacts on its screen.** The LCD plays short 1-bit animations: *HI!* with a
  heart on check-in, *YUM!* while it chomps a snack, a bouncing ball when you win at
  Play, and sparkles on a level-up. When it evolves, the screen flashes.
- **It calls you.** A blinking **!** on the screen means something needs you: a
  payment or proposal waiting for your OK, a critical alert, or the pet is hungry.
  Open alerts pile up as little messes on the screen floor until you review them.
- **An evolution chart** shows the stages it has reached. Stages still to come are
  mystery silhouettes.
- **Tap the screen for stats**, like a real Tamagotchi: age, hearts for hunger,
  happiness, energy and portfolio health, and how much of your money could be cash
  within 7 days.
- **It shows what the desk just did**, for example *"Latest: Sentinel finished ·
  2m ago"*.
- **It evolves:** Drop → Droplet → Splash → Wave → Tide over ten levels. XP comes
  only from habits: daily check-ins, deciding proposals, reviewing alerts, three
  daily quests, and a little from work the desk does. Each habit has a daily cap.
  Trading more never earns XP.

## Investing: orders, schedules and statements

- **Market orders** on any product, checked live by Sentinel as you type.
- **Limit orders** on the index funds, the momentum strategy and bitcoin: buy at or
  below, or sell at or above, a price you set. They are checked when you place
  them, fill on the first market day the price reaches your limit (or at once if
  it already has), and expire after 90 days. Cancel them any time.
- **Recurring investments**: a fixed amount every week, two weeks or month,
  managed under **Autopilot**. They are your own instructions, so they keep running
  while agents are paused, but every buy passes the pre-trade checks. A buy that
  can't go through (not enough cash, a limit that would be broken) is skipped with
  an alert, and the plan stays on schedule.
- **Autopilot rules** for strategies such as *"if bitcoin falls 20% from its high,
  buy $1,000"*.
- **Statements**: **Activity → Download statement (CSV)** exports every trade,
  deposit and withdrawal, agent payment and agent-wallet transfer.
- Your pet and any connected agent can read your recurring investments and limit
  orders (`get_standing_orders`), but only you can create or change them.

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
- **Your pet at the till.** On the Agent Pay page, the pet's screen reacts to every
  payment: **PAID!**, **ASK OWNER** when it needs your OK, or **NO!** when your
  policy declines.
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

### Agent traders, identified with AINRA

Outside AI agents can trade for you, and MyLiquid knows who they are. An agent identifies itself with its
[AINRA](https://github.com/JacobJandon/ainra) passport: who runs it, its tier, what it declares it may do, and
whether its registrar still vouches for it. MyLiquid verifies passports itself, offline and fail-closed, with the
published `@ainra/sdk`. **Identity decides autonomy.**

| The agent | What it may do |
|---|---|
| Not identified | Read and propose; you approve every trade |
| AINRA L0–L1 | Read only |
| AINRA L2 | Trade; on its own up to $2,500 a trade, within your limits |
| AINRA L3 / L4 | Trade and pay; on its own up to $10,000 / $25,000 a trade |

To trade on its own, an agent must also:
- declare `myliquid:trade` in its passport;
- present a fresh passport at least every 5 minutes;
- stay within the per-trade and daily limits you set.

Every order it places still passes the mandate, Sentinel's checks and the kill switch. Its orders and proposals
carry its AINRA Number. If its registrar revokes it, its next presentation is refused, its key stops working, its
pending proposals are withdrawn and Sentinel alerts you.

1. **Invite.** Under **Traders**, create a one-time invite: what the agent may do, and its limits.
2. **The agent connects itself.** It redeems the invite with its passport:

   ```bash
   curl -s https://<your-host>/api/agent-identity/enroll -H "Content-Type: application/json" \
     -d '{"invite": "mli_...", "ainra_passport": <bundle JSON or base64url>}'
   ```

   It gets back an API key already pinned to its AINRA Number, the MCP endpoint and a 5-minute presentation window.
   It re-presents with `POST /api/agent-identity` (`{"ainra_passport": …}`, authenticated with its key).
3. **It trades over MCP.** `propose_trade` either executes on its own or becomes a proposal, with the reason.
   `get_my_permissions` tells the agent who MyLiquid thinks it is and what it may do right now.
4. **You stay in charge.** Under **Traders** you see each agent's identity, whether it is identified right now,
   its limits (editable) and what it traded today, and you can disconnect it.

**Your AI traders.** Hire a testbed agent under **Traders → Your AI traders** and it works for you once every
market day:
1. It presents its AINRA passport.
2. It reads your portfolio and the signals through the MCP tools.
3. It decides with its strategy and trades with `propose_trade`, on its own within its limits.

| Trader | Tier | What it does |
|---|---|---|
| Northwind Momentum Trader | L2 | Buys the strongest uptrend among MLUS, MLWX and MLQM; trims a held downtrend |
| Harbor Treasury Agent | L3 | Keeps cash near 8% (± 2%) by parking the excess in the bond index, or raising cash from it |
| Northwind Research Analyst | L1 | Writes a daily market note; can't trade |

- **When they work:**
  - when you advance the market (+1d);
  - when you open MyLiquid on a new market day;
  - daily on Vercel (a cron job);
  - on **Run now**.
- **What you see:** each trader's decisions, what it traded on its own, its proposals and the P&L of its trades,
  on the Traders page and on Home.
- **What stops them:** pause, let go, or the kill switch.

They are hosted by MyLiquid for the demo, but they go through the same identity gate, MCP tools, limits, mandate
and Sentinel checks as an agent running anywhere else.

**Test drive.** In testbed mode, **Traders → Test drive** runs a sample agent through all of this from your browser,
against the real endpoints: invite, enroll, read, a trade it may make on its own, one over its limit, and (for the
yield hunter) revocation.

The testbed agents were minted with AINRA's own registrar under its TEST-ROOT (`scripts/mint-ainra-testbed.sh`,
`src/lib/ainra/testbed/`):

| Agent | Tier | Capabilities |
|---|---|---|
| Northwind Momentum Trader | L2 | `myliquid:read`, `myliquid:trade` |
| Northwind Research Analyst | L1 | `myliquid:read` |
| Harbor Treasury Agent | L3 | `myliquid:read`, `myliquid:trade`, `myliquid:pay` |
| QuickFox Yield Hunter | L2 | `myliquid:read`, `myliquid:trade`, then revoked by its registrar |

Everything verified against them is labelled `TESTBED · TEST-ROOT`. With real trust anchors (`AINRA_ROOTS_FILE`,
`AINRA_DIRECTORY_FILE`) MyLiquid verifies real passports at real time. See
[`docs/research/platform-review-and-ainra.md`](docs/research/platform-review-and-ainra.md) for the design and its
limits.

### Bring your own agent (MCP)

Like Robinhood, Webull, Gemini and Coinbase, MyLiquid exposes its tools over the **Model Context Protocol**.

| Key scope | What it can do |
|---|---|
| *read* | See your portfolio, liquidity, deals, signals, risk, standing orders, wallet and nearby terminals |
| *trade* | Also propose trades, rebalances and autopilot rules |
| *pay* | Also pay terminal codes and buy premium data from the agent wallet, under the card policy |

Agent traders get keys through invites (above). For other MCP clients, create a key under
**Traders → Manual setup** and point the client at `/api/mcp`:

```bash
claude mcp add --transport http myliquid https://<your-host>/api/mcp \
  --header "Authorization: Bearer mlk_..."
```

A key that isn't pinned to an AINRA identity only proposes. Connected agents get the same guardrails as the
desk: Sentinel's checks, the mandate and the kill switch. They are rate-limited, and every call is recorded in
your audit log.

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

To put it online privately (Vercel + Turso, or any host with a disk), follow
[`docs/DEPLOY.md`](docs/DEPLOY.md).

On the landing page, **Try the live demo** opens a private guest account, with a
year-old sample portfolio and its own pet, in one click. You can save it later by
creating an account. **Hatch your agent** starts sign-up: name your pet and pick
its colour, answer three risk questions (they set your profile and hard limits),
and start with $100,000 of demo cash or the sample portfolio.

Things to try:

1. **Home.** Your pet checks in when you visit. Press *Feed*, then *Play*, tap the
   screen for its stats, and watch the XP and quests.
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
9. **Traders → Test drive.** Pick a testbed agent: watch it enroll with its AINRA
   passport, trade on its own within its limits, and (the yield hunter) get cut
   off when its registrar revokes it. Or invite your own agent, or connect Claude
   with a key under *Manual setup*.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit and integration tests (Vitest, in-memory SQLite) |
| `npm run test:libsql` | The same tests against a libSQL server (`LIBSQL_TEST_URL`, e.g. a local `turso dev`; wipes it) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint (Next.js config) |
| `npm run check` | Typecheck, lint and test |
| `npm run db:reset` | Wipe and re-seed the database (local file, or Turso when configured) |
| `scripts/mint-ainra-testbed.sh` | Re-mint the AINRA testbed agents with AINRA's registrar (needs an AINRA checkout and Rust) |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (none) | Enables Claude-powered agents. Without it, agents run offline |
| `MYLIQUID_MODEL` | `claude-opus-5` | Model used by the agents |
| `MYLIQUID_EFFORT` | `medium` | Reasoning effort (`low` … `max`) |
| `MYLIQUID_AGENT_MODE` | auto | Force `offline` or `claude` |
| `MYLIQUID_DB_PATH` | `.data/myliquid.db` | SQLite file location |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | (none) | A hosted libSQL database (Turso) in place of the file. Required on Vercel. `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` also work |
| `CRON_SECRET` | (none) | Vercel sends it to the daily hosted-traders job; when set, nothing else can call it |
| `MYLIQUID_SITE_PASSWORD` | (none) | Makes the whole site private behind one password (HTTP Basic auth; agent API endpoints stay key-authenticated) |
| `MYLIQUID_SIM_START` | today | Market date to seed from (YYYY-MM-DD) |
| `MYLIQUID_MARKET_CLOCK` | auto | `manual` stops the market from catching up to today's date |
| `MYLIQUID_COOKIE_SECURE` | `true` in production | Set `false` to serve over plain HTTP (e.g. Docker on a LAN IP) |
| `AINRA_ROOTS_FILE` / `AINRA_DIRECTORY_FILE` | testbed | AINRA root keys and root-signed registrar directory (JSON). Unset = the bundled TEST-ROOT samples |
| `AINRA_AUDIENCE` | empty | This service's audience for AINRA instance credentials. Empty accepts none (fail-closed) |

Claude requests use adaptive thinking, streaming, prompt caching on the system
prompt, and server-side refusal fallbacks (`fallbacks: "default"`).

## Deploying

See [`docs/DEPLOY.md`](docs/DEPLOY.md): Vercel with a Turso database (step by step,
private), or Docker on any host with a disk:

```bash
docker build -t myliquid .
docker run -p 3000:3000 -v myliquid-data:/data -e ANTHROPIC_API_KEY=... myliquid
```

`/api/health` reports whether the database and agents are set up.

## Project layout

```
src/
  app/                 Next.js App Router: landing page, /app/* pages, /api/* routes
  proxy.ts             Optional site password (MYLIQUID_SITE_PASSWORD)
  components/          UI kit, charts, pet (pixel sprite, device, room), pay (card, POS terminal, panels), app components
  lib/
    domain/            Pure logic: catalog, market sim, liquidity, risk, valuation, diligence, rebalance, signals,
                       companion (vitals, XP, quests), payments (merchants, card policy),
                       agent trading (what an outside agent's AINRA identity lets it do), trader strategies
    db/                SQLite schema, seed, connection; hosted libSQL (Turso) wrapper
    services/          Investors, portfolio, orders & settlement, proposals, alerts, audit log, rules, API keys,
                       market clock, companion (the pet), payments (wallet, card, terminals, x402),
                       agent identity and invites (AINRA-identified outside traders), hosted traders
    agents/            Agent registry, tools, Claude loop, offline agents, runner
    auth/              Password hashing (scrypt), sessions, cookies
    mcp/               MCP server (official SDK, stateless Streamable HTTP)
    ainra/             AINRA passport verification (@ainra/sdk), trust anchors, TEST-ROOT testbed agents
docs/
  research/            Agentic-finance landscape; agent payments, AI companions and design; platform review and AINRA (Sept 2026)
  startup/             The startup plan (what we sell, to whom, roadmap, budget) and the research behind it (Oct 2026)
  ARCHITECTURE.md      How the pieces fit together
  DEPLOY.md            Private deployment: Vercel + Turso, or Docker
```

More detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Roadmap

The company plan, with MyLiquid Gate (runtime governance for agents that trade and pay) as the first product, is
in [`docs/startup/plan.md`](docs/startup/plan.md). For the app itself:

- Email verification, password reset and passkeys
- OAuth for MCP clients (in place of pasted API keys)
- Live market data and a broker adapter in place of the simulation
- Real agent cards through a licensed issuer on an agentic-token program
  (Mastercard Agent Pay, Visa Intelligent Commerce), and real x402 settlement
- NFC/QR tap-to-pay from a phone in place of typed terminal codes
- Scheduled desk cycles and push notifications (for example, "your pet is hungry",
  or a payment waiting for approval)
