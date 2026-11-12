# Board brief: MyLiquid

You are reviewing a business idea. Everything you know about it is on this page; it was compiled from the founder's
own plan and discovery documents. Nothing here has been tested with real customers yet.

## The idea

**MyLiquid Gate** is a runtime governance layer for AI agents that trade and pay with real money. A broker, crypto
venue, neobank or trading-platform vendor puts it in front of the access it gives to AI agents. Before an agent's
trade or payment executes, Gate:

1. checks who the agent is and who stands behind it (an "agent passport" from AINRA, an open agent-identity registry
   the founder also started; other "Know Your Agent" standards such as Visa's Trusted Agent Protocol, Skyfire and
   Mastercard are planned through adapters, not built yet), and fails closed when it cannot verify;
2. decides what the agent may do from its identity tier, the end customer's mandate and the firm's rules: execute,
   ask a human to approve, or refuse;
3. runs pre-trade and pre-payment checks (caps, concentration, liquidity, rate limits, merchant and amount rules);
4. keeps an append-only, hash-chained record of every decision and why, exportable under the headings supervisors
   use (Singapore MAS's SAFR safeguard classes, FINRA books-and-records expectations);
5. can stop one agent, one customer's agents or every agent at a firm in one call.

It is delivered as a hosted decision API, an SDK, and an **MCP guardrail proxy** that sits in front of a broker's
existing MCP server (the protocol AI agents use to call tools) with no code change on the broker's side.

A **consumer app**, also called MyLiquid, runs on Gate: each account gets an AI agent with a Tamagotchi-style pet that
invests, rebalances and pays (its own agent card) within limits the user sets, asks before anything bigger and shows
every decision. It runs on demo money with real end-of-day prices for index funds and bitcoin, installs on phones from
the browser, and is the sales demo for Gate. A third product, **Arena**, would let developers run identified agents on
real market data with paper money and get certified ($499 per agent per year).

## Who it is for

- **Paying customer (Gate):** the head of product, CTO or chief compliance officer at a mid-size broker, crypto venue
  or neobank opening customer accounts to AI agents; then trading-platform vendors (one integration reaches every
  broker on the platform); then wealth-tech platforms; then agentic trading startups that need to prove their agent
  is safe to a broker.
- **App beachhead:** agent-curious self-directed investors who invest monthly in a broker app, already ask ChatGPT or
  Claude about money, with $5,000 to $250,000 invested.

## Prices (planning assumptions, not tested)

| Plan | Price |
|---|---|
| Developer | Free: 10,000 governed actions a month, community support |
| Growth | $1,500 a month: 1M governed actions, every adapter, evidence export, kill-switch API, webhooks; then $1 per extra 1,000 |
| Enterprise | $60,000 to $250,000 a year: volume pricing, private cloud or on-prem, SSO, SLA, SOC 2 report, custom policies |
| Agent certification | $499 per agent a year |

A "governed action" is a trade, payment or sensitive tool call Gate decides on; reads are free. The consumer app is
free on demo money today. A paid consumer subscription is planned only after real money, through licensed partners
(a broker via Alpaca's Broker API, an adviser registration the company would own), at a price not set.

## Why now, according to the founder's research (figures from press and search summaries, not verified)

- Robinhood rolled trading agents out to its customers in September 2026; its agents make about 30 million tool calls
  a day. About half the brokers one review site tested run an MCP server for agents.
- Robinhood's terms put the risk of agent trades on the customer.
- FINRA's 2026 oversight report names agent risks; MAS's SAFR asks for a runtime governance layer between an agent
  and the systems it acts on; the card networks announced "Know Your Agent" work in September 2026.
- Funded neighbours in 2026: Baselayer ($35M, agent identity), AIUC ($40M, certifies and insures agents), Natural
  ($30M, agent payments), Skyfire ($9.5M, agent credentials), Runlayer ($11M, governance for MCP agents), Alinia
  ($7.5M) and Archestra ($3.3M, runtime guardrails).

## Go to market (planned)

Five design partners free for six months in exchange for feedback, a reference and a letter of intent naming the
price after the pilot; an open-source version of the MCP proxy as the developer on-ramp; a free "agent readiness"
checklist for compliance officers; agent-trading hackathons; partners (Alpaca's developer community, AIUC, agent
identity registrars); regulatory sandboxes (FCA, MAS). 20 discovery interviews are planned; none done yet.

## What exists today

A working demo built by the founder with an AI coding assistant: the consumer app (web and Android), the decision
engine and a public decision API, the MCP guardrail proxy v0, the tamper-evident log and its SAFR/FINRA report, live
agent identities through AINRA's registrar, and a discovery toolkit (waitlist, surveys, experiments, analytics). Not
built yet: multi-firm tenancy (the biggest piece), other identity adapters, a firm console, Arena. No customers, no
interviews, no revenue. The public site is not yet open to visitors.

## Money and team

- Lean first 12 months: about $710,000 (two founders on below-market salaries $180k, a founding engineer from month 3
  $140k, a BD lead from month 6 $72k, a fractional compliance officer $48k, legal $40k, SOC 2 and pen test $70k,
  infrastructure and data $30k, insurance $25k, go-to-market $50k, buffer $55k).
- Funding plan: a $750k to $1M pre-seed SAFE at a $10M to $15M cap after design partners sign; a $3M to $4M seed around
  month 9 to 12.
- Year-1 revenue target: about $480,000 ARR by month 12 (3 enterprise customers at about $80k, 10 Growth customers at
  $18k a year, 120 certified agents at $499).
- Team: one founder today, who also started AINRA (the plan is to keep AINRA in a separate neutral entity). A
  co-founder (enterprise sales or infrastructure) and a fractional compliance officer are planned.
- Constraints: never hold customer funds, no investment advice before an adviser registration, no SOC 2 report yet,
  contracts would position Gate as decision support with capped liability.

## Open decisions the founder has listed

The wedge (Gate first is the current recommendation, versus Arena first or the consumer app first), where to
incorporate, a co-founder, AINRA's governance, funding timing.
