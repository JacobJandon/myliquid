# 1. Problem and audience

## The problem, in one sentence each

**For people with money to invest:** AI can now act on your money, not just talk about it, but there is no way to
hand an agent a *bounded* job (limits you set, approval for anything bigger, a record of every decision, one
switch that stops it), so most people either keep doing it all themselves or hand over everything and hope.

**For the firms whose accounts agents use:** brokers and fintechs are opening their accounts to AI agents, but
cannot tell which agent is acting, who stands behind it, or whether it stayed within what the customer allowed,
and when it goes wrong the customer carries the loss.

## Why now (from [`../startup/research.md`](../startup/research.md))

- Agents already trade real money: Robinhood rolled trading agents out to its whole customer base in September
  2026, and half of the brokers StockBrokers.com tested run an MCP server for agents.
- Nobody owns the risk: Robinhood's terms put all risk of agent trades on the customer (the "liability gap").
- Regulators have started to describe "safe": FINRA's 2026 oversight report names agent risks; MAS's SAFR asks
  for a runtime governance layer; the card networks agreed on Know Your Agent.

These are reasons the problem is new and growing. They are not proof that *our* audience feels it enough to
switch; that is what step 2 tests.

## Who has the problem

| Segment | Who | The job they hire MyLiquid for | What they use today |
|---|---|---|---|
| **A. Agent-curious self-directed investors** (beachhead) | Invest monthly themselves in a broker app, already ask ChatGPT or Claude about money, $5k–$250k invested | "Keep my investing on track without spending my evenings on it, and without losing control" | Broker app plus a chatbot, copy-pasting between them; spreadsheets |
| B. Busy delegators | Use a robo-adviser or nothing; want help but not a black box | "Let something competent handle it, where I can see and stop it" | Robo-advisers, a human adviser, cash |
| C. Agent builders | Developers building trading or finance agents | "Run my agent on real market data with guardrails, and prove it's safe to a broker" | Paper accounts, their own scripts, nothing that proves safety |
| D. Brokers and fintechs (MyLiquid Gate) | Head of product, CTO or chief compliance officer at a mid-size broker, crypto venue or neobank opening agent access | "Let agents in without carrying risk I can't see or explain to a regulator" | Rate limits on API keys, in-house rules, nothing for identity |

## The beachhead and why

**Segment A**, for the app. They already have the behaviour (asking AI about money) and the pain (doing the
acting themselves, or not trusting an agent to). They are reachable cheaply where they already gather (investing
and AI communities), they can try the product today with demo money, and every one of them is a future customer
of the brokers in segment D, which is what makes MyLiquid credible in Gate sales.

**Segment D**, for revenue, runs in parallel through interviews and design partners, as the business plan
recommends: it is where the money is, and it needs conversations, not traffic.

Segments B and C are watched (the waitlist asks who people are) but not targeted until A or D says yes.

## What we must be right about (riskiest first)

| # | Assumption | Why it could be wrong | Tested in |
|---|---|---|---|
| A1 | Investors want an agent to **act** within limits, not only to advise | Trust in AI with money may be too low; "advise me" may be the whole demand | Waitlist (what they'd let an agent do), interviews, activation |
| A2 | Visible guardrails, approvals and a kill switch are what make them comfortable | They may want a brand, insurance or a human instead | Interviews, headline A/B (safety vs pet), PMF benefit answers |
| A3 | They come back on their own (weekly) | Investing is low-frequency; novelty fades | Day-7 and day-30 retention |
| A4 | The pet helps habits and retention rather than cheapening trust | A Tamagotchi may feel unserious for money | Headline A/B, retention, PMF "improve" answers |
| A5 | They would pay (subscription or a small asset fee) once it's real money | Free brokers set the price expectation at zero | Interviews, later a pricing fake door |
| D1 | Firms feel the agent-identity and control gap now, with a budget owner | They may wait for regulation or build it themselves | 20 business interviews, design-partner requests |
| D2 | Identity (AINRA and other KYA standards) is part of what they need | API keys may feel "enough" | Interviews, Gate usage with verified vs unverified agents |

Feasibility and regulation (real money through licensed partners) is a known path, not a discovery risk: see
the business plan. It comes after these are answered.
