# Agentic finance landscape (research, September 2026)

This is the research the MyLiquid product is based on. It covers who is putting AI
agents into trading, investing and wealth management, which guardrails they ship,
what went wrong, and what regulators are worried about. Each section ends with the
design decision it drove in MyLiquid.

> Sources were gathered with web search on 2026-09-24. Several publisher sites
> (robinhood.com, techcrunch.com, cnbc.com) could not be fetched directly from the
> build environment, so details come from search summaries and secondary coverage.
> Re-verify specifics before quoting them externally.

---

## 1. Brokers opening up to AI agents

### Robinhood: Cortex, then Agentic Trading

| | Cortex (in-house assistant) | Agentic Trading (bring your own agent) |
|---|---|---|
| Launched | 2025, expanded to Gold members in Q1 2026 | Beta on 2026-05-27 (equities), crypto added later; event contracts and futures announced |
| Who acts | Robinhood's own AI | External models: Claude, ChatGPT, Cursor, Grok, Codex, any MCP client |
| What it does | Stock and Portfolio **Digests** (plain-language summaries of catalysts), Trade Builder (thesis → options strategy), a chat assistant that can place trades you ask for | Research, place orders, rebalance, within a dedicated account |
| Execution | User confirms trades | Agent executes; some trades show a **preview the user must approve** |
| Connection | In-app | Robinhood-hosted **MCP server** + **OAuth** (the agent never sees your password) |
| Isolation | n/a | Separate **"Agentic" account**. Agents only touch the balance you move into it; that balance is the hard ceiling |
| Monitoring | n/a | Push notification per trade, live activity feed and P&L, **one-tap disconnect** |
| Liability | Robinhood | Robinhood states it does not control or audit the models and acts as the execution channel |

More than 100,000 users opened funded Agentic accounts by July 2026. Robinhood also
launched an **Agentic Credit Card** (agents can spend on your behalf). CEO Vlad Tenev
has described the end state as giving everyday investors "the same tools, the same
computation, the same power" institutional and HFT firms have had.

Robinhood is also pushing into **private markets for retail**: Robinhood Ventures
Fund I (NYSE: RVI, a closed-end fund holding names like Revolut and Databricks)
fell 11% on its first trading day in March 2026, and Fund II (RVII, a BDC) followed
in August 2026.

**What MyLiquid takes from it**
- Agents run inside an **agent mandate** with a funded budget. The budget is the
  hard ceiling, and agents cannot touch money outside it.
- Every agent trade has a **preview**. Above the user's autonomy threshold, it
  becomes a **proposal that needs one-tap approval**.
- Plain-language **digests** (Ledger/Atlas summaries) instead of raw numbers.
- A per-trade activity feed and a **global kill switch** ("Pause all agents").
- Private-market exposure is shown at **independent appraisal value**, not at
  whatever a secondary market or the manager says. RVI's first-day discount shows
  how far the two can diverge.

### Public: the "agentic brokerage"

Public started rolling out **AI Agents** in March 2026. It was the first broker to
call itself an *Agentic Brokerage*. Users describe a strategy in plain language (for
example "If VIX hits 25, buy a put on the S&P 500"). The agent asks follow-up
questions to pin down timing and conditions, then monitors and executes. It covers
stocks, ETFs, options, crypto and bonds in brokerage and IRA accounts, with activity
logs and pause, modify and stop controls. Public (and SoFi) keep the AI **inside
their own app** rather than handing control to an external model.

**What MyLiquid takes from it:** **Autopilot rules**. Plain-language rules are
compiled into a structured trigger (condition → action → size) that the user
reviews before activation, and every rule can be paused.

### Webull, eToro, Gemini, Coinbase

- **Webull** has run an MCP server since April 2026 (market data, balances,
  positions, place/modify/cancel orders). Controls: **order caps, a symbol
  whitelist and a read-only mode**.
- **eToro Agent Portfolios**: a named portfolio with a budget from $200, linked to
  an agent via a **scoped API key**. The agent can only open or close trades inside
  that portfolio. Not available to US clients. In July 2026 eToro rebuilt its app
  around its own "Tori" agent.
- **Gemini** (April 2026): first regulated US exchange with direct agent
  integration over MCP. It launched with read-only market-data modules (market
  data, spread, candles) before order entry.
- **Coinbase for Agents** (June 2026): Claude/ChatGPT connect to Coinbase accounts
  to trade spot and derivatives, with equities, index funds, prediction markets and
  commodities planned. This builds on AgentKit (agent wallets, 2024) and the
  **x402** payment protocol (May 2025, 100M+ transactions).
- Deriv, IG and ThinkMarkets also ship MCP servers. Spotware's cTrader ships
  vendor-level agent infrastructure.

**What MyLiquid takes from it:** the mandate has a **per-order cap, a daily cap, an
asset whitelist and a read-only switch**. External agents connect through **scoped
API keys** (read vs. trade) and pass the same pre-trade checks as internal agents.
MCP access is on the roadmap.

### Morgan Stanley

In June 2026 Morgan Stanley opened its stock-plan platforms (Shareworks, Equity
Edge) to clients' AI agents over MCP. That channel is tied to about $1.2T of assets
gathered through its workplace business. Its thesis: the moat moves from owning the
interface to owning **data, workflows and business intelligence**.

**What MyLiquid takes from it:** every capability is an API or tool first and a
screen second. The UI, the in-house agents and (later) external agents all call the
same service layer.

---

## 2. AI as the investment manager

- **Bridgewater AIA Labs** (formed 2023) runs a machine-learning fund where the model
  is the **primary decision-maker** and humans oversee **risk, data and
  execution**. The AIA Macro fund (about $4.5B) returned 8.1% in H1 2026, in line
  with flagship Pure Alpha. Its "Pocket Analyst" compresses hours of research into
  minutes.
- **Research agents**: Hebbia (answers from your own documents, with citations,
  used in PE data rooms), Rogo (banking-formatted outputs: models, decks, memos) and
  AlphaSense (search across filings and broker research).
- **Anthropic** (May 2026) shipped 10 ready-to-run financial-services agent
  templates (pitchbooks, KYC screening, month-end close, due-diligence packs) and
  connectors to FactSet, S&P Capital IQ, MSCI, PitchBook and Morningstar.

**What MyLiquid takes from it:** a **desk of specialist agents** with separated
duties, the Bridgewater split. Strategy and trading agents propose. An independent
**risk agent** and the **human** approve. A **valuation agent** that does not report
to the strategist marks the book. The diligence agent (Scout) writes a memo with a
red-flag checklist for every private deal.

---

## 3. What has gone wrong

- **Step Finance (January 2026).** AI trading agents with permission to make large
  transfers **without human approval** moved about 261,000 SOL ($27–30M) after
  attackers compromised executives' devices. The agents did what they were built to
  do, for the wrong people. The token fell 97%, $4.7M was recovered, and the company
  shut down.
- **Prompt injection.** In March 2026 a financial-services firm found that its
  customer-facing agent had been leaking internal pricing data for three weeks after
  a crafted question overrode its system prompt.
- **Kill switches that don't exist or don't work.** Surveys through 2026 found that
  most enterprises cannot reliably stop a running agent.

**What MyLiquid takes from it**
- **No agent can move money off the platform.** Withdrawals to a bank are
  human-only actions.
- Agents never execute from free text. Every order is a typed tool call, validated
  against a schema, and runs **server-side** through the same pre-trade checks.
- **Kill switch.** One switch pauses every agent and autopilot rule. A circuit
  breaker trips it automatically on a large daily drawdown.
- An **append-only audit log** records every agent thought summary, tool call and
  result.

---

## 4. Private markets: the liquidity problem

The founding idea for MyLiquid came from the Windhorst/H2O case. A fund promised
daily liquidity while holding illiquid private bonds, marked them itself, and
gated. Seen from 2026:

- Semi-liquid **evergreen private-credit funds** are going through their first
  large stress test. Typical terms cap redemptions at **5% of NAV per quarter**
  (20% a year), pro-rate any excess, and roll unfilled requests forward.
- In Q1 2026 some large managers saw requests above the 5% cap. Blackstone lifted
  BCRED's quarterly limit to 7.9%. Others gated.
- Institutional-only versions of the same strategies usually offer **no**
  redemptions. The retail "semi-liquid" label is where the mismatch lives.

**What MyLiquid takes from it.** This is the brand: *"Know exactly how liquid you
are."*
- Every product carries **explicit liquidity terms**: settlement days, redemption
  frequency, notice period, lock-up and gate percentage.
- The dashboard's **liquidity ladder** shows how much you could actually have in
  cash today, in 30 days, in 1 year and after lock-ups end.
- Private sleeves are **locked (5–7 years) or quarterly with a 5% gate**. We never
  market daily liquidity on an illiquid asset.
- **Concentration limit:** no single originator above 5% of a portfolio.
- **Independent valuation:** private marks come from a named third-party appraiser.
  Ledger flags any mark older than 35 days or marked by the originator.

---

## 5. Regulators

- **FINRA 2026 Oversight Report**: a new GenAI section on **agent risks**, namely
  autonomy with no human in the loop, over-broad permissions and access, and misuse
  of sensitive data. It expects firms to assess compliance before deploying agents,
  to supervise them, to track agent actions and restrict system access, and to
  cover AI in their Written Supervisory Procedures.
- **Bank of England** (Deputy Governor Sarah Breeden, Sintra, 2026-06-30): agents
  trained on similar data could **herd**, "amplify volatility in stress" and trigger
  a "market meltdown". The BoE is considering **market-wide circuit breakers / kill
  switches**. In June 2026, House Financial Services Democrats sent the SEC 13
  questions on correlated trading by AI agents.
- The SEC, CFTC and FINRA have **not** issued AI-specific rules yet. Existing rules
  (suitability, supervision, books and records) apply.

**What MyLiquid takes from it:** a **suitability profile** gates every trade. There
is a **permissions matrix** per agent, **rate limits** on agent orders (to damp
herding) and a daily turnover cap. Everything is logged. Human approval is the
default, and autonomy is opt-in and bounded.

---

## 6. Agentic payments (roadmap context)

Visa Intelligent Commerce and its Trusted Agent Protocol, Mastercard Agent Pay
(agentic tokens, all US cardholders since November 2025), the Stripe Agentic
Commerce Suite (shared payment tokens), Google's AP2 (donated to the FIDO Alliance
in April 2026, with 60+ partners) and Coinbase's x402 are the rails agents will use
to move money. MyLiquid does **not** let agents move money off-platform in v1.
These rails are listed on the roadmap for funding and for paying for research data.

---

## Sources

- [Robinhood is Now Open to Agents (newsroom)](https://robinhood.com/us/en/newsroom/robinhood-is-now-open-to-agents/)
- [Agentic Trading overview, Robinhood support](https://robinhood.com/us/en/support/articles/agentic-trading-overview/)
- [Robinhood now lets your AI agents trade stocks, TechCrunch](https://techcrunch.com/2026/05/27/robinhood-now-lets-your-ai-agents-trade-stocks/)
- [Robinhood Launches Agentic Trading with External AI Models, KuCoin](https://www.kucoin.com/news/flash/robinhood-launches-agentic-trading-with-external-ai-models)
- [Robinhood CEO: AI agents will have 'capability' of humans in trading, CNBC](https://www.cnbc.com/2026/07/02/robinhood-ceo-ai-agents.html)
- [Robinhood Lets Agents Trade Stocks and Make Payments, Finovate](https://finovate.com/robinhood-lets-agents-trade-stocks-and-make-payments/)
- [Robinhood MCP setup guide, SecProve](https://secprove.com/trading-agent-safety/connect-agent-to-robinhood)
- [Introducing Robinhood Strategies, Banking and Cortex](https://robinhood.com/us/en/newsroom/introducing-strategies-banking-and-cortex/)
- [Cortex Digests, TipRanks](https://www.tipranks.com/news/robinhood-cortex-digests-a-unique-way-to-stay-updated-with-ai-powered-portfolio-insights)
- [Robinhood's venture fund tanks 11% on first day, CNBC](https://www.cnbc.com/2026/03/06/robinhoods-venture-fund-which-gives-investors-access-to-private-companies-tanks-11percent-on-first-day.html)
- [Introducing Robinhood Ventures Fund II (RVII)](https://www.globenewswire.com/news-release/2026/08/03/3337801/0/en/introducing-robinhood-ventures-fund-ii-rvii.html)
- [Public becomes the first brokerage to introduce AI Agents, PR Newswire](https://www.prnewswire.com/news-releases/public-becomes-the-first-brokerage-to-introduce-ai-agents-for-your-portfolio-302729050.html)
- [AI Agents for Investing, Public.com](https://public.com/ai-agents)
- [Fintechs Put AI in the Driver's Seat with Agentic Trading, Corporate Insight](https://corporateinsight.com/fintechs-put-ai-in-the-drivers-seat-with-agentic-trading/)
- [Agent Portfolios, eToro](https://www.etoro.com/news-and-analysis/etoro-updates/agent-portfolios-let-your-ai-agent-trade-for-you/)
- [Webull Agentic Trading](https://www.webull.com/agentic)
- [Brokers race to open trading infrastructure to AI agents via MCP, LeapRate](https://www.leaprate.com/technology/broker-mcp-ai-agent-trading-infrastructure-race-2026/)
- [Introducing Agentic Trading on Gemini](https://www.gemini.com/blog/introducing-agentic-trading-on-gemini-the-future-of-crypto-is-autonomous)
- [Coinbase launches tool to let AI agents manage trading and payments, CNBC](https://www.cnbc.com/2026/06/11/coinbase-launches-tool-to-let-ai-agents-manage-trading-and-payments.html)
- [coinbase/agentkit, GitHub](https://github.com/coinbase/agentkit)
- [Morgan Stanley will open its wealth management funnel to AI agents, CNBC](https://www.cnbc.com/2026/06/03/ai-agents-morgan-stanley-wealth-management-funnel.html)
- [The future of Wall Street: AI agents trading 24/7, CNBC](https://www.cnbc.com/2026/07/28/ai-agents-build-to-trade-24/7-the-future-of-wall-street.html)
- [Bridgewater macro fund gains in H1 2026, Crypto Briefing](https://cryptobriefing.com/bridgewater-macro-fund-gains-h1-2026/)
- [AIA Labs, Bridgewater](https://www.bridgewater.com/aia-labs)
- [Agents for financial services, Anthropic](https://www.anthropic.com/news/finance-agents)
- [Anthropic deepens push into Wall Street, Fortune](https://fortune.com/2026/05/05/anthropic-wall-street-financial-services-agents-jamie-dimon/)
- [Rogo vs Hebbia vs AlphaSense comparisons, Hebbia](https://www.hebbia.com/resources/financial-research-platforms)
- [Private credit confronts the limitations of the semi-liquid label, WealthManagement.com](https://www.wealthmanagement.com/alternative-investments/private-credit-confronts-the-limitations-of-the-semi-liquid-label)
- [Evergreen fund liquidity terms compared, McDermott](https://www.mcdermottlaw.com/insights/not-all-private-credit-fund-liquidity-is-the-same-the-markets-evolution-and-a-comparison-of-evergreen-fund-liquidity-terms/)
- [FINRA 2026 Oversight Report: GenAI and agent risks, Debevoise](https://www.debevoisedatablog.com/2025/12/11/finras-2026-regulatory-oversight-report-continued-focus-on-generative-ai-and-emerging-agent-based-risks/)
- [FINRA AI key topics](https://www.finra.org/rules-guidance/key-topics/artificial-intelligence)
- [BoE's Breeden warns AI agents risk triggering market meltdowns, Bloomberg](https://www.bloomberg.com/news/articles/2026-06-30/boe-s-breeden-warns-ai-agents-risk-triggering-market-meltdowns)
- [Bank of England floats kill switch for agentic AI trading, ResultSense](https://www.resultsense.com/news/2026-07-01-boe-breeden-agentic-ai-kill-switch/)
- [AI kill switch explained, CNBC](https://www.cnbc.com/2026/09/19/ai-kill-switch-explained.html)
- [Kill-switch gap in agentic AI, AuthorityGate](https://authoritygate.com/newsletter/kill-switch-gap-agentic-ai/)
- [Agentic payment rails compared, RisingWave](https://risingwave.com/blog/mastercard-agent-pay-vs-visa-vs-stripe-agentic-commerce/)
- [Visa, Mastercard and Coinbase fight over how AI agents pay, Forbes](https://www.forbes.com/sites/digital-assets/2026/06/07/visa-mastercard-and-coinbase-are-fighting-over-how-ai-agents-pay/)
