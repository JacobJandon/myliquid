# MyLiquid: the startup plan

How MyLiquid goes from a working demo to a company: what we sell, to whom, for how much, what we build in what
order, who we hire, what it costs, and what we decide when. The evidence behind it is in
[`research.md`](research.md).

> Written 2026-10-02. Market figures come from search summaries and need checking before they go in a deck or a
> contract (see the note at the top of `research.md`). Prices, targets and budgets are planning assumptions to test
> with customers, not facts.

## 1. The bet in one paragraph

AI agents now trade and pay with real money: Robinhood alone handles about 30 million agent tool calls a day, and
half the brokers tested this year run an MCP server. Nobody independent checks what those agents are allowed to do,
and when one gets it wrong the customer carries the loss (the **liability gap**). Regulators have started to say what
"safe" means: MAS's SAFR asks for a runtime governance layer between the agent and the systems it acts on, and
FINRA expects firms to supervise, restrict and record agent actions. The card networks agreed on **Know Your Agent**
in September. **MyLiquid becomes that runtime layer for finance**: it checks who an agent is, decides what it may do
from its identity, the customer's mandate and the firm's rules, checks every trade and payment before it executes,
keeps the evidence, and can stop everything at once. The product already exists inside our own app; the company is
about selling it to the firms whose agents need it.

## 2. What we offer

Three products, built in this order. The first one pays the bills; the second brings agents and developers to us;
the third is the long-term consumer business and, until then, our showcase.

### P1. MyLiquid Gate (B2B, first)

A runtime governance layer that a broker, crypto venue, neobank or trading-platform vendor puts in front of its
agent access.

| Capability | What it does | Where it comes from in our code |
|---|---|---|
| **Agent identity (KYA)** | Verifies who the agent is and who stands behind it. AINRA first, then Visa Trusted Agent Protocol, Skyfire tokens and Mastercard agent registration through adapters. Fail-closed. | `lib/ainra` (`checkPassport`), `identityGate` |
| **Mandates and tiered autonomy** | Turns identity + the end customer's mandate + the firm's rules into a decision: execute, ask a human, or refuse. Per-agent limits capped by identity tier. | `autonomyDecision` in `lib/domain/agentTrading.ts`, scopes ∩ tier ∩ declared capabilities |
| **Pre-trade and pre-payment checks** | Caps, concentration, liquidity, rate limits, budget, merchant and amount rules, before anything executes. | `runPreTradeChecks`, `runMandateChecks`, `evaluatePayment` |
| **Human in the loop** | Anything above the agent's autonomy becomes a proposal that a person approves, through the firm's own approval flow (webhook). | Proposals and approvals in `lib/services/proposals.ts` |
| **Kill switch and circuit breaker** | Stop one agent, one customer's agents, or every agent at a firm, in one call. Revoking an identity cuts the agent off and withdraws what it left pending. | Kill switch, circuit breaker, revocation handling |
| **Evidence** | An append-only record of every decision and why, stamped with the agent's identity, exportable in the shape a supervisor asks for (SAFR safeguard classes, FINRA books and records). | `agent_events`, orders and proposals stamped with key and AINRA Number |
| **Delivery** | A hosted decision API, an SDK, and an **MCP guardrail proxy** that sits in front of a broker's existing MCP server with no code change on their side. | MCP server in `lib/mcp/server.ts`, `callMcpTool` |

Who buys it, in order:

1. **Mid-size brokers, crypto venues and neobanks** opening their accounts to agents. They face the same risks as
   Robinhood without its engineering team.
2. **Trading-platform vendors** (cTrader, TraderEvolution and similar). One integration reaches every broker on the
   platform.
3. **Wealth-tech and RIA platforms** letting advisers or clients use agents.
4. **Agentic trading startups** that need to prove to a broker that their agent is safe to let in.

### P2. MyLiquid Arena (developer sandbox and certification)

A place where agent developers connect an identified agent to **real market data with paper money**, build a track
record, and get certified.

- **Real data, no risk.** Alpaca paper trading ($100K simulated per account, real quotes) behind the same Gate an
  actual broker would use. No funds and no advice, so no licence.
- **Identity first.** Only AINRA-verified (later any KYA-verified) agents enter; every order carries the agent's
  identity.
- **Track records.** A public page per agent: returns, drawdown, how often it hit its limits, how many unsafe actions
  Gate blocked. Brokers can trust a record they didn't have to build.
- **Certification.** A yearly conformance suite (does the agent respect limits, handle refusals, stop on the kill
  switch, recover from revocation), run by our own adversarial test agents. The aim is to pair it with AIUC: their
  pre-deployment audit and insurance, our runtime evidence.
- **Why it matters for P1.** Developers bring agents; agents with a certified record are what brokers want to admit;
  brokers then want the same Gate in production.

### P3. MyLiquid app (consumer: on phones now, real money later)

Today's app: the pet, the agent desk, the liquidity ladder, Agent Pay. It is also the **reference deployment of
Gate**: every sales demo shows Gate inside a real product.

**Decided on 2 October 2026:** the company and the app are called **MyLiquid**, and the app runs on phones now,
at almost no cost ([`../MOBILE.md`](../MOBILE.md)).

| Step | Cost |
|---|---|
| An installable app on Android and iPhone, straight from the browser | Free |
| An Android APK, built by GitHub Actions | Free |
| Google Play, once the company has an organization developer account (required for investing apps) | $25 once |
| The iPhone App Store, when the app needs something native | $99 a year |

Until then it runs on simulated markets and demo money, which lets people try the full experience and gives us
users to learn from before any licence is needed.

Real money comes only after a decision gate (section 6), through partners:

- a state-registered investment adviser (RIA) we own;
- brokerage and custody through Alpaca's Broker API (or DriveWealth, Apex);
- KYC through Persona or similar;
- agent cards through Stripe Issuing, Lithic or Highnote with a sponsor bank.

We never hold customer money ourselves.

### What we don't do

- Hold customer funds, route orders for our own account, or trade proprietary capital.
- Give investment advice before the RIA exists.
- Issue a token.
- Promise performance anywhere, including the Arena.

## 3. Pricing

Priced on **governed actions**: every trade, payment or sensitive tool call that Gate decides on. Reads are free.

| Plan | Price | Includes |
|---|---|---|
| **Developer** | Free | 10,000 governed actions a month, AINRA plus one other KYA adapter, Arena sandbox, community support |
| **Growth** | $1,500 a month | 1M governed actions, every adapter, evidence export, kill-switch API, webhooks, email support. Then $1 per extra 1,000. |
| **Enterprise** | $60,000–250,000 a year | Volume pricing down to $0.25–0.50 per 1,000, private cloud or on-prem, SSO, SLA, our SOC 2 report, custom policies, regulator-ready evidence packs |
| **Agent certification** | $499 per agent a year | Conformance suite, verified track record page, badge. Free for open-source agents. |

Why these numbers:

- **Anchor on what it replaces.** A broker that builds this itself needs two or three engineers and a compliance
  analyst for a year: $500k+. Enterprise at $60–250k is well under that.
- **Margins.** A decision is a database read and a few checks: fractions of a cent per thousand. Gross margin should
  stay above 80% once SOC 2 and support are paid for.
- **Scale.** At Robinhood's volume, even $0.50 per 1,000 would be about $5.5M a year (illustration in
  `research.md` §2).

**Year-1 revenue target: about $480k ARR by month 12.**

| Source | Count | Average | ARR |
|---|---|---|---|
| Enterprise (converted design partners) | 3 | $80,000 | $240,000 |
| Growth | 10 | $18,000 | $180,000 |
| Agent certification | 120 agents | $499 | $60,000 |
| **Total** | | | **$480,000** |

A miss here is not fatal if design partners are live in production by then; seed investors in this space weigh
usage and logos over early revenue.

## 4. What we build, mapped to the repo

The engine exists; the work is turning a single-app feature into a product other companies call.

| Piece | Today | Work to do |
|---|---|---|
| **Decision engine** | Spread across `agentTrading.ts`, Sentinel checks, `evaluatePayment` | Extract into `src/lib/gate/`: one pure `decide(action, context)` returning allow / propose / block, reasons and an evidence record. Unit-tested like `lib/domain`. |
| **Tenancy** | Everything is scoped by `investor_id` | Add firms above investors: firm → end customer → agent. Firm API keys, firm-level policies and kill switch. The biggest single piece of work. |
| **Decision API** | Internal calls only | `POST /api/gate/v1/decide`, `/evidence`, `/halt`; signed webhooks for proposals. Target p99 under 50 ms. |
| **MCP guardrail proxy** | Our own MCP server | A proxy that forwards to any broker's MCP server and sends trade-class tool calls through `decide` first. Alpaca's paper-trading MCP server first. Open-source it. |
| **KYA adapters** | AINRA only | A `KyaVerifier` interface; AINRA stays the reference. Add Visa TAP (verifying signed HTTP headers against Visa's published keys) and Skyfire tokens; Mastercard when its registration API is open. |
| **Evidence export** | `agent_events`, CSV statements | Hash-chain the log so tampering shows. Export JSON/CSV/PDF mapped to SAFR's four safeguard classes and FINRA's expectations. |
| **Console** | Settings and Traders pages | A firm console: agents, decisions, proposals queue, kill switch, evidence download. Reuse the UI kit. |
| **Arena** | Simulated market, hosted traders | Alpaca paper adapter per agent account, leaderboard and track-record pages, conformance suite. The hosted traders become our adversarial test agents. |
| **Security** | Fail-closed identity, scoped queries | Threat model, dependency and secret scanning, external pen test before the first production customer, then SOC 2. |

Engineering rules that carry over from `CLAUDE.md`: money in integer cents, pure money logic in `lib/domain`,
nothing trades except through one function, identity verification fail-closed, offline mode keeps working.

## 5. Go to market

**Motion: design partners first, open source for reach, content for credibility.**

1. **Design partner program.** Five firms, free for six months, in exchange for weekly feedback, a reference and
   an LOI that names the price after the pilot. Start with brokers and venues that launched MCP this year without a
   Robinhood-sized team, and the platform vendors behind them.
2. **Open-source MCP guardrail proxy.** Free, self-hosted, Apache-2.0. It is the developer on-ramp: anyone running
   an agent against a broker's MCP can put limits and a kill switch in front of it in minutes. Hosted Gate adds
   identity, evidence, tenancy and the console.
3. **Compliance content.** A free "agent readiness" checklist mapping SAFR and FINRA's 2026 expectations to
   concrete controls, and a self-assessment. Compliance officers are the buyer's internal champion.
4. **Arena and hackathons.** Agent-trading hackathons on the Arena with real data and paper money; the leaderboard
   gives developers a reason to identify their agents.
5. **Partners as channels.**
   - Alpaca: its developer community and Broker API partners.
   - AINRA registrars and the agents they identify.
   - AIUC: certified agents need runtime evidence.
   - The KYA working groups behind Visa, Mastercard and Ant, and MAS's BuildFin.ai.
6. **Regulatory sandboxes.** Apply to the next FCA AI Live Testing cohort and engage with MAS BuildFin.ai. Being
   tested alongside a regulator is the strongest sales asset this category has.

**Discovery interviews: what to ask (20 in the first month).**

- How do agents reach your accounts today, and what stops one from doing something the customer didn't want?
- Who in the firm owns that risk? Has compliance or a regulator asked about it yet?
- How do you know which agent placed an order, and who is behind it?
- What happens today if you need to stop every agent at once?
- Have you priced building this in-house? Who would build it, and when?
- If this existed today, what would it need to do for you to pay for it this year?

What we listen for: a named owner, a regulator or auditor asking, an incident, and a budget line.

## 6. Roadmap and decision gates

| Phase | When | Build | Business | Gate to pass |
|---|---|---|---|---|
| **0. Validate** | Weeks 0–4 | Phone app live (installable, Android APK: done). Extract `lib/gate`, decision API, MCP proxy v0 against Alpaca paper | Incorporate, 20 interviews, landing page, legal opinion on the vendor path; first testers on the phone app | ≥10 interviews confirm the pain and a budget owner; ≥2 LOIs. Otherwise pivot the wedge to Arena-first or consumer-first. |
| **1. Pilot-ready** | Months 1–3 | Tenancy, Visa TAP adapter, evidence export, console, Arena v0, threat model and pen test | Sign 3–5 design partners, start SOC 2 (Type I), apply to sandboxes | 2 pilots running in staging or paper; p99 under 50 ms. Then raise the pre-seed. |
| **2. First production** | Months 3–6 | Hardening, SLA tooling, on-prem option, certification suite | First production customer, pre-seed closed, first hires, SOC 2 Type I report | 1 paying production customer and a second in contract. |
| **3. Scale** | Months 6–12 | Mastercard adapter, more brokers' MCP servers, evidence packs | ~$480k ARR target, SOC 2 Type II window, seed preparation | Seed-ready: live customers, growing governed actions, clear pipeline. Decide on consumer real money (below). |

**The consumer decision (month 12).** Go ahead with P3's real-money launch only if Gate is self-sustaining or the
seed round funds it separately, a compliance lead is in place, and Alpaca (or another partner) has agreed terms. The
RIA takes 4–6 months to stand up, so decide early enough to start the filing.

## 7. Company, team and hiring

**Company.**

- **Delaware C-corp** (for example through Stripe Atlas), the default for US investors and US customers.
- **IP.** Assign this repository and all MyLiquid IP to the company on day one.
- **Trademark and domain.** Check "MyLiquid" before spending on the brand.
- **Insurance.** Technology errors and omissions plus cyber before the first production customer; D&O once there is
  a board.
- **Contracts.** Gate is decision support: the customer's own controls decide, our decision is an input. Cap our
  liability and carry insurance for it.

**AINRA stays neutral.**

- AINRA is your project, and a broker will only adopt an identity standard that a competitor doesn't control.
- Keep AINRA's governance separate from the company: its own foundation or entity, open specification, other
  verifiers welcome. MyLiquid is one verifier among many, and Gate supports other KYA standards from day one.
- Disclose the relationship in sales conversations. Done this way, AINRA's neutrality helps MyLiquid instead of
  limiting it.

**Team.**

| Role | When | Why |
|---|---|---|
| Founder (you) | Now | Product, AINRA, the story, first sales |
| Co-founder | Now, if possible | The half you don't cover: enterprise fintech sales, or deep infrastructure engineering. Investors in this space strongly prefer a pair. |
| Fractional chief compliance officer | Month 1, about a day a week | Ex-broker or ex-FINRA. Makes the evidence export credible and sits in sales calls. |
| Founding engineer (security and infrastructure) | Month 2–3 | Tenancy, latency, SOC 2, pen-test fixes |
| Solutions or BD lead | Month 6 | Runs pilots and integrations |
| Advisors | Month 1–3 | A broker that launched MCP this year, a card-network or KYA person, a fintech lawyer |

Claude stays the engineering partner in the repo throughout: building, testing, documenting, and drafting the
compliance mapping.

## 8. Money

**Lean first 12 months: about $710k.**

| Item | Amount |
|---|---|
| Two founders, below-market salaries | $180,000 |
| Founding engineer from month 3 (loaded) | $140,000 |
| Solutions or BD lead from month 6 | $72,000 |
| Fractional CCO ($4,000 a month) | $48,000 |
| Legal: incorporation, regulatory opinion, contracts, trademark | $40,000 |
| SOC 2 (platform, Type I and Type II audits) and pen test | $70,000 |
| Infrastructure, market data, Claude API | $30,000 |
| Insurance (E&O, cyber, D&O) | $25,000 |
| Go to market: events, hackathons, design, travel | $50,000 |
| Buffer (about 8%) | $55,000 |
| **Total** | **$710,000** |

**The phone app adds almost nothing to this.**

| Item | Cost |
|---|---|
| Installing from the browser | Free |
| Android builds on GitHub Actions | Free |
| Google Play | $25 once |
| Vercel Pro, once the app is commercial | $20 a month |

**Funding path.**

- **Pre-seed: $750k–1M** on a SAFE at a $10–15M cap, raised at the end of Phase 1 with design partners signed. It
  covers the 12 months above.
- **Seed: $3–4M** at $15–22M pre-money, around month 9–12, on live customers and usage.
- **Before raising,** stay lean: no salaries until the pre-seed, free tiers, startup credits (Stripe Atlas, cloud
  providers, Anthropic, Vanta or Drata startup programmes).

**Who to talk to** (check each one's current thesis first):

- Fintech-focused funds: Ribbit Capital (led AIUC's round), QED, Nyca, Better Tomorrow Ventures, Fin Capital,
  Anthemis.
- Strategics: Coinbase Ventures, Visa Ventures, Amex Ventures.
- Programmes: Y Combinator, a16z speedrun, Mastercard Start Path, Visa's fintech partner programme.

## 9. How we measure it

- **North star: governed agent actions per month.** It grows with customers, with agents per customer, and with
  how much those agents do.
- **Leading indicators:**
  - design partners signed, then live;
  - time to integrate (target: under a day with the MCP proxy);
  - verified agents enrolled, in the Arena and at customers;
  - unsafe actions blocked, and incidents prevented (the number customers quote to their board).
- **Business:** ARR, net revenue retention, gross margin, months of runway.
- **Quality:** p99 decision latency, uptime, zero false "allow" on a revoked or unverified identity.

## 10. Risks and what we do about them

| Risk | Mitigation |
|---|---|
| Big brokers build it themselves | Sell to the mid-market and platform vendors who can't; for the big ones, be the independent evidence and the cross-venue identity layer they can't credibly provide about themselves. |
| KYA standards fragment | Be the neutral verifier: adapters for every standard, AINRA as one of them. Fragmentation is a reason to buy us. |
| AINRA is pre-genesis | Gate works without it (Visa TAP, Skyfire first in sales). Support AINRA's genesis as an early verifier. |
| Rules change or arrive | Track SAFR, FINRA and the FCA closely; map the evidence export to each. New rules increase demand. |
| We're blamed for a loss | Contracts: decision support, liability cap. E&O insurance. Fail closed: when unsure, propose instead of allow. |
| A security breach | Threat model, pen test, SOC 2, least privilege, no customer funds held, minimal personal data. |
| Long enterprise sales cycles | Design partners, the open-source proxy for bottom-up adoption, Growth plan for smaller firms, platform vendors as multipliers. |
| Solo founder bandwidth | Co-founder search from day one; fractional CCO; Claude carries most of the engineering until the first hire. |

## 11. The next 30 days

| Week | You | Claude (in this repo) |
|---|---|---|
| **1** | Install MyLiquid on your phone and share it with a few testers. Set the `MYLIQUID_HOST` repository variable and create your Android signing key (`docs/MOBILE.md`). Decide the open questions below. Incorporate. List 40 target firms and book 20 interviews. Open an Alpaca account for paper-trading keys. | Phone app: done (installable app, phone layout, Android APK pipeline). Extract the decision engine into `src/lib/gate/` with tests. Draft landing-page copy for Gate and a one-page interview guide. |
| **2** | Run interviews. Book a fintech lawyer for the vendor-path opinion. Start the co-founder and CCO search. | Decision API (`/api/gate/v1/decide`, `/halt`, `/evidence`). MCP guardrail proxy v0 in front of Alpaca's paper-trading MCP server. |
| **3** | More interviews. Ask the warmest prospects for LOIs. Reach out to AIUC and Alpaca partnerships. | Visa TAP adapter behind a `KyaVerifier` interface. Hash-chained evidence log and SAFR/FINRA-mapped export. |
| **4** | Phase 0 review against its gate. Pre-seed deck first draft. Design-partner agreement template, reviewed by the lawyer. | Arena v0: Alpaca paper accounts for identified agents, a leaderboard, record pages. Demo script and recording plan. |

## 12. Decisions only you can make

1. **The wedge.** B2B Gate first (recommended), Arena first, or the consumer app first.
2. **Where to incorporate.** Delaware C-corp (recommended for US customers and investors), or the UK or Singapore if
   you want to be close to the FCA or MAS sandboxes from the start.
3. **A co-founder,** and which half they cover.
4. **AINRA's governance.** Agree to keep it in a separate, neutral entity, and decide who else sits on it.
5. **Funding.** Bootstrap through Phase 0 and raise with LOIs (recommended), or raise now.
6. **The name: decided.** MyLiquid, for the company and the app, with "Gate" and "Arena" as product names.
7. **Your time.** Full-time from now, or a date when you go full-time.
