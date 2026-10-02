# Startup research: agentic finance, October 2026

The research behind [`plan.md`](plan.md): why now, who would pay, who else is building this, what regulators expect,
which partners carry the licences, and what things cost. It builds on
[`../research/agentic-finance-landscape.md`](../research/agentic-finance-landscape.md) (brokers opening to agents)
and [`../research/agent-pay-and-companions.md`](../research/agent-pay-and-companions.md) (agent payments).

> Gathered with web search on 2026-10-02. Direct page fetches were blocked from the build environment, so most
> figures come from search-result summaries of the linked articles. Treat every number as a lead to verify before
> using it in a deck, a contract or anything public.

## 1. Why now

**Agents already trade real money at scale.**
- **Robinhood.** It rolled out trading agents built on OpenAI and Anthropic models to all of its roughly 29 million
  customers on 29 September 2026, three days before this note. More than 150,000 customers had opened Agentic
  accounts since the May launch. Agents call Robinhood's tools nearly 30 million times a day.
- **Other brokers.** Seven of fourteen brokers tested by StockBrokers.com ran a first-party MCP server in 2026, all
  launched this year: Webull, eToro, Gemini, Coinbase, Public, IG, ThinkMarkets and others.
- **Platform vendors.** cTrader and TraderEvolution ship agent infrastructure to the brokers that use them.

**Nobody is accountable for what the agents do.**
- Robinhood's terms say the customer "assume[s] all risk for trades executed by AI agents".
- The agentic features sit in a separate company, Robinhood Labs LLC, which is not a broker-dealer, investment
  adviser or money transmitter.
- Commentators call this the **liability gap**: autonomy is delegated completely, responsibility not at all.

**Regulators are writing down what "safe" looks like, without new rules yet.**
- **FINRA** (2026 Oversight Report, Dec 2025) names agent risks for the first time:
  - autonomy without human validation;
  - agents acting beyond their scope;
  - reasoning that is hard to audit;
  - data misuse.

  It expects firms to track agent actions, restrict access, and cover AI in supervision and books and records.
  No AI-specific SEC or FINRA rule exists; existing rules apply.
- **The Monetary Authority of Singapore** (SAFR, *Safeguards for Agentic Finance at Runtime*, July 2026)
  describes a runtime governance layer between the agent and the systems it acts on. It has four safeguard
  classes: policy-bound execution, real-time validation before execution, auditability, and interoperability.
- **The Bank of England** (June 2026) warned that herding agents could amplify stress, and floated market-wide
  kill switches.
- **The UK FCA's AI Live Testing.** The second cohort (April to end of 2026) includes agentic payments and
  investment-support use cases. The evaluation report is due in Q1 2027.

**The card networks are standardising agent identity.**
- On 9–10 September 2026, Visa, Mastercard and Ant International announced a cross-network **Know Your Agent
  (KYA)** framework, convened under MAS's BuildFin.ai and building on SAFR. It has three pillars:
  - operator traceability;
  - shared certification;
  - continuous transaction monitoring.
- Each network keeps its own protocol: Visa's Trusted Agent Protocol (signed HTTP headers), Mastercard's
  Verifiable Intent and agent registration, and Ant's Agentic Mobile Protocol.

**Money is flowing into the layer around agents.**

| Company | Raise | What it does |
|---|---|---|
| Baselayer | $35M (Sept 2026, about $40M total) | Agent identity verification |
| AIUC | $40M Series A (Sept 2026, Ribbit) | Certifies agents (AIUC-1, about 5,000 adversarial tests) and insures them up to $50M |
| Natural | $30M Series A (July 2026) | Agent payment rails |
| Skyfire | $9.5M | KYA credentials for agents |
| Nekuda | $5M seed | Agent payments |
| Runlayer | $11M seed | Governance and observability for MCP agents |
| Alinia | $7.5M seed | Runtime guardrails |
| Archestra | $3.3M seed | Runtime guardrails |

Y Combinator's 2026 batches include agentic trading desks, AI hedge funds, wealth-ops agents and debit cards for
agents.

## 2. Market

**Top-down context.** These numbers frame the opportunity; they are not our market.

| Measure | Figure | Source |
|---|---|---|
| Global agentic commerce by 2030 | $3–5T | McKinsey |
| US e-commerce through agents by 2030 | $190–385B (10–20% of online retail) | Morgan Stanley |
| US e-commerce through agents by 2030 | $300–500B | Bain |
| Agentic payments market | $7B growing to $93B by 2032 | Third-party estimate |
| SEC-registered investment advisers (2025) | 16,544 advisers, 73.7M clients, $176.8T regulatory AUM | IAA/Comply 2026 Snapshot |
| FINRA broker-dealers (end of 2025) | 3,184 firms, 639,723 registered reps | FINRA 2026 Snapshot |
| Robo-advisers | Vanguard about $300B, Schwab about $90B, Betterment about $70B, Wealthfront about $48–93B depending on the measure | Form ADV filings, press |

**Bottom-up: who would buy an agent-governance layer first.**
- About 20–40 brokers, exchanges and trading-platform vendors already expose MCP or agent APIs, or have announced
  them.
- About 300 mid-size brokers, crypto venues, neobanks and wealth platforms will need to within 18 months.
- The long tail: 3,184 broker-dealers and 16,544 RIAs, mostly through the platform vendors and custodians they
  already use.

**Usage, for scale.** Robinhood's agents make about 30M tool calls a day. At $0.50 per 1,000 governed actions,
that one broker alone would be about $5.5M a year. Illustrative, not a forecast.

## 3. Competition

| Group | Who | What they cover | What they leave open |
|---|---|---|---|
| Brokers building in-house | Robinhood, Webull, Public, eToro, IBKR | Their own agent access, caps, whitelists, read-only modes | Identity across venues, independent evidence, smaller brokers who can't build it |
| Generic agent security | Runlayer, Alinia, Archestra, Zenity, Saviynt, Arthur | MCP gateways, policy-as-code, observability | Finance semantics: suitability, mandates, settlement, liquidity, books and records |
| KYA and identity | Baselayer, Skyfire, Trulioo/Worldpay (Digital Agent Passport), Sumsub, Visa TAP, Mastercard, ERC-8004, **AINRA** | Who the agent is and who stands behind it | What the agent may do *here*, and enforcement at runtime |
| Agent certification and insurance | AIUC | Pre-deployment testing, audits, insurance | Live enforcement inside a broker |
| Agent payments | Stripe (Issuing for agents, Link, x402), Lithic, Highnote, Marqeta, Natural, Payman, Nekuda, Crossmint | Cards, tokens and wallets for agents, spend controls | Trading and investing |

The gap is the **finance-specific runtime layer**. One place that:
- verifies who the agent is, through any KYA standard;
- decides what it may do from its identity, the customer's mandate and the firm's rules;
- checks every action before it executes;
- keeps the evidence a supervisor or court will ask for;
- can stop everything at once.

That is SAFR's "runtime governance layer" applied to trading and payments. MyLiquid already implements it for
itself.

## 4. What MyLiquid already has that maps onto this

| SAFR / FINRA expectation | In the codebase |
|---|---|
| Policy-bound execution | Mandate (caps, sleeves, budget, rate limit), `autonomyDecision`, Sentinel pre-trade checks (`runPreTradeChecks`, `runMandateChecks`) |
| Real-time validation before execution | Every trade goes through `executeOrder` / `agentTrade`; payments through `evaluatePayment` |
| Agent identity and operator traceability | `lib/ainra` (fail-closed verification with `@ainra/sdk`), `identityGate`, keys pinned to AINRA Numbers, invites |
| Least privilege and tiered autonomy | Scopes ∩ tier floor ∩ declared capabilities; per-agent limits capped by tier |
| Human oversight and escalation | Proposals and approvals; kill switch; circuit breaker |
| Auditability, books and records | Append-only `agent_events`; orders and proposals stamped with key and AINRA Number; CSV statements |
| Revocation | Revoked passport → key cut off, pending proposals withdrawn, alert |
| Interoperability | MCP server; agents enroll over plain HTTP |

## 5. Regulation and licences, by path

**A. B2B software vendor (the governance layer).**
- No broker-dealer, adviser or money-transmitter licence is needed, provided we don't give advice, hold customer
  funds or route orders for our own account.
- Customers will run vendor due diligence, because FINRA puts vendor risk on the broker. Expect:
  - SOC 2 Type II;
  - a penetration test;
  - security questionnaires;
  - data-processing terms;
  - business continuity.
- Contract terms must make clear that the customer's own controls decide, with our decision as an input.

**B. Developer sandbox (paper trading).**
- No funds and no advice, so no licence.
- Watch two things:
  - **Market-data redistribution terms.** Showing real-time exchange data to the public needs the vendor's
    redistribution plan, or delayed data.
  - **Marketing language.** No performance promises.

**C. Consumer money app (later).**
- **Registered investment adviser.** State registration under $100M AUM. About $10–50k and 4–6 months; state
  approval about 30–45 days after filing.
- **Brokerage and custody through a partner.** Alpaca Broker API (FINRA/SIPC member; commission-free stocks,
  options and crypto; pricing negotiated per partner), or DriveWealth, Apex and similar.
- **KYC.** For example Persona, about $250/month for 500 checks, then $1–1.50 per check, with startup credits.
  Plaid and Alloy quote on request.
- **Money movement and cards.** Through partners: Plaid for account links; Stripe Issuing, Lithic or Highnote with
  a sponsor bank for agent cards. Never hold funds ourselves.
- **Ongoing rules:** the SEC marketing rule, Reg S-P (privacy and incident notice), and books and records.

**Elsewhere.**
- **Singapore** (MAS BuildFin.ai/SAFR) and the **UK** (FCA AI Live Testing) are the natural places to test with a
  regulator.
- The **SEC's Innovation Exemption** (launched September 2026) covers tokenized-securities venues. Not our path,
  but a sign the SEC is open to automated, AI-driven market structure.

## 6. Partners and building blocks

| Need | Options | Notes |
|---|---|---|
| Real market data and paper trading | Alpaca: free paper trading with $100K simulated, an official MCP server, data $99/month for full SIP real time. Polygon. | The fastest way to make the sandbox real |
| Brokerage for a consumer app | Alpaca Broker API, DriveWealth, Apex | Pricing negotiated per partner |
| Agent identity | AINRA (open, pre-genesis), Visa TAP (verify signed headers), Mastercard agent registration, Skyfire KYA tokens, Trulioo DAP | Support several; be the neutral verifier |
| Agent cards and payments | Stripe Issuing for agents and Link wallet, Lithic, Highnote; x402 (Stripe since February 2026, USDC on Base) | Card rates 2.9% + $0.30 on Stripe's agentic suite; x402 fees near zero |
| Certification and insurance | AIUC | Partner, not competitor: their audit plus our runtime evidence |
| Compliance tooling | Vanta, Drata | For SOC 2 |

## 7. What things cost

| Item | Range | Source |
|---|---|---|
| SOC 2 Type II, first year | $45–70k typical for a small startup ($25k low end): platform $7.5–15k/year, audit $15–40k, setup $5–20k | Drata, Vanta, auditor guides |
| RIA setup | $10–50k (average about $25k), 4–6 months | SmartAsset, InnReg |
| KYC per check | about $1–2 | Persona, Plaid |
| Market data | $0–99/month (Alpaca); more for redistribution | Alpaca |
| Seed round (fintech) | Median about $3.2M at $15–22M pre-money; AI seed median $4.6M | 2026 seed reports |
| Pre-seed | Median SAFE caps $10M (under $1M raised) to $15M ($1–2.5M) | 2026 pre-seed reports |

## Sources

- [Robinhood just rolled out trading agents to millions, Fortune (2026-09-29)](https://fortune.com/2026/09/29/robinhood-trading-agents-hood-openai-anthropic/)
- [Robinhood Gave AI Agents a Trading Account and a Credit Card. The Liability Gap Just Got Wider, Forkast](https://forkast.news/robinhood-gave-ai-agents-a-trading-account-and-a-credit-card-the-liability-gap-just-got-wider/)
- [Robinhood Agentic Trading: AI Governance and Liability, FintechLaw.ai](https://fintechlaw.ai/blog/robinhood-agentic-trading-ai-governance-liability)
- [What happens to your money if your AI trading agent makes a mistake, Finder](https://www.finder.com/investments/ai-trading-agent-liability)
- [Best Brokers for AI Trading Agents in 2026: MCP Tested, StockBrokers.com](https://www.stockbrokers.com/guides/ai-agent-brokers)
- [Brokers race to open trading infrastructure to AI agents via MCP, LeapRate](https://www.leaprate.com/technology/broker-mcp-ai-agent-trading-infrastructure-race-2026/)
- [FINRA 2026 Regulatory Oversight Report: GenAI and agent risks, Debevoise](https://www.debevoisedatablog.com/2025/12/11/finras-2026-regulatory-oversight-report-continued-focus-on-generative-ai-and-emerging-agent-based-risks/)
- [FINRA publishes 2026 Regulatory Oversight Report](https://www.finra.org/media-center/newsreleases/2025/finra-publishes-2026-regulatory-oversight-report-empower-member-firm)
- [Safeguards for Agentic Finance at Runtime (SAFR), MAS](https://www.mas.gov.sg/publications/monographs-or-information-paper/2026/safeguards-for-agentic-finance-at-runtime)
- [MAS SAFR explained, Ashurst Perkins Coie](https://www.ashurstperkinscoie.com/en/insights/mas-safr-explained-singapores-runtime-governance-standard-for-agentic-ai-in-finance/)
- [Visa, Mastercard and Ant International build first cross-network Know Your Agent framework, Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/visa-mastercard-ant-international-build-111358124.html)
- [Visa and Mastercard team with Ant on Know Your Agent framework, PYMNTS](https://www.pymnts.com/cybersecurity/2026/visa-mastercard-team-with-ant-know-your-agent-framework)
- [Securing agentic commerce with Visa and Mastercard, Cloudflare](https://blog.cloudflare.com/secure-agentic-commerce/)
- [FCA announces second cohort for AI Live Testing](https://www.fca.org.uk/news/press-releases/fca-announces-second-cohort-ai-live-testing)
- [SEC rolls out innovation exemption for tokenized securities venues, CoinDesk](https://www.coindesk.com/policy/2026/09/17/sec-rolls-out-long-awaited-innovation-exemption-for-tokenized-securities-venues)
- [Baselayer raises $35M for AI agent identity verification, Tech Times](https://www.techtimes.com/articles/327943/20260923/baselayer-raises-35m-build-ai-agent-identity-verification-no-law-yet-requires.htm)
- [Sumsub adds AI agent verification to its Know Your Agent framework, PYMNTS](https://www.pymnts.com/news/artificial-intelligence/2026/sumsub-adds-ai-verification-know-your-agent-framework/)
- [AIUC raises $40M to insure AI agents, Crypto Briefing](https://cryptobriefing.com/aiuc-raises-40m-series-a-ai-insurance/)
- [Natural raises $30M for AI agent payments, TechCrunch](https://techcrunch.com/2026/07/20/natural-raises-30m-to-reinvent-payments-for-ai-agents-and-take-on-stripe/)
- [Agentic commerce infrastructure startups: Skyfire, Basis Theory, Nekuda, Rye, Stellagent](https://stellagent.ai/insights/agentic-commerce-infra-startups)
- [Top AI governance platforms for agentic AI in 2026, Arthur](https://www.arthur.ai/column/best-ai-governance-platforms-2026)
- [AI safety startup funding 2025–2026, New Market Pitch](https://newmarketpitch.com/blogs/news/ai-safety-funding-analysis)
- [Agentic commerce market size forecast: McKinsey, Gartner and Bain, Stellagent](https://stellagent.ai/insights/agentic-commerce-market-size-forecast-2030)
- [Investment Adviser Industry Snapshot 2026, IAA](https://www.investmentadviser.org/wp-content/uploads/2026/06/Snapshot-2026.pdf)
- [FINRA 2026 Industry Snapshot](https://www.finra.org/sites/default/files/2026-05/2026-Industry-Snapshot.pdf)
- [Robo-advisor AUM by provider: 2026 SEC filings](https://www.bestroboadvisors.org/robo-advisor-aum-by-provider/)
- [Alpaca Broker API](https://alpaca.markets/broker) and [Alpaca MCP server](https://github.com/alpacahq/alpaca-mcp-server)
- [RIA state vs SEC registration for fintechs, InnReg](https://www.innreg.com/blog/ria-state-vs-sec-registration) and [RIA startup costs, SmartAsset](https://smartasset.com/advisor-resources/ria-startup-costs)
- [KYC pricing benchmarks 2026, Zyphe](https://www.zyphe.com/resources/blog/kyc-cost-reduction)
- [SOC 2 audit cost, Drata](https://drata.com/learn/soc-2/cost)
- [Stripe Sessions 2026: 288 launches](https://stripe.com/newsroom/news/sessions-2026) and [Lithic: built for agentic payments](https://www.lithic.com/blog/agentic-payments)
- [Stripe Link agents and x402 explained, Eco](https://eco.com/support/en/articles/14839406-stripe-link-agents-and-x402-explained)
- [Seed round size by sector in 2026, ValueAdd VC](https://valueaddvc.com/blog/seed-round-size-by-sector-in-2026-ai-fintech-saas-healthcare-defense-and-consumer-ranked) and [H1 2026 pre-seed report, Causo](https://hub.causo.ai/guides/h1-2026-pre-seed-funding-report)
- [Y Combinator investing startups, 2026](https://www.ycombinator.com/companies/industry/investing)
