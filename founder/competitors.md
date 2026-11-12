# Competitors: MyLiquid

Two markets, because MyLiquid sells to two buyers: **Gate** (brokers, venues and neobanks letting AI agents act on
customer accounts) and **the app** (agent-curious self-directed investors). Every fact links to its source in
`competitors.csv`.

**How this was researched (2026-11-12).** Web search only. Opening the vendors' own pages from this session was
blocked by its network policy, so most facts come from search summaries of press, listings and comparison sites, not
the vendors' price pages. Treat prices as leads to confirm. Enterprise vendors publish almost no prices and have no
public reviews, so the complaints section is thin; that is a finding in itself.

## 1. Gate: who is there

| # | Competitor | Type | What it sells | Price for the closest thing |
|---|---|---|---|---|
| 1 | [Runlayer](https://www.tamradar.com/funding-rounds/runlayer-series-a-30m) | Direct | MCP gateway and control plane (discovery, access control, real-time inspection); **$30M Series A** (Felicis, Khosla) | [Contact sales](https://www.beri.net/tools/runlayer) |
| 2 | [Alinia](https://techfundingnews.com/alinia-raises-7-5m-seed-ai-compliance-finance/) | Direct, finance | Guardrails API with an Investment Guard for MiFID II; Santander and Origin Financial named; $7.5M seed | Not found |
| 3 | [Archestra](https://siliconangle.com/2026/06/02/archestra-raises-10m-broker-ai-agent-access-corporate-data/) | Direct | Open-source runtime where deterministic policies decide every LLM and tool call; **$10M seed** (20VC, June 2026) | Not found; open core |
| 4 | [TrueFoundry](https://www.truefoundry.com/blog/runlayer-pricing) | Direct, general | MCP gateway | $499 a month Pro, 25 MCP servers (its own page, secondary) |
| 5 | [Lasso MCP Gateway](https://itbrief.co.uk/story/lasso-introduces-first-security-gateway-for-mcp-workflows) | Direct, general | Open-source (MIT) MCP gateway; commercial platform | Free open source; commercial not public |
| 6 | [Invariant Guardrails (Snyk)](https://labs.snyk.io/resources/snyk-labs-invariant-labs) | Direct, general | Open-source (Apache-2.0) guardrails and gateway for MCP | Free |
| 7 | [AIUC](https://www.securityweek.com/aiuc-raises-40-million-to-certify-enterprise-ai-agents/) | Indirect | AIUC-1 certification and insurance up to $50M; $40M Series A (Ribbit) | Not public |
| 8 | [Skyfire](https://skyfire.xyz/know-your-agent-kya/), [Vouched](https://www.vouched.id/kya-pricing) | Indirect, identity | Know Your Agent tokens and checks | Skyfire usage-based ([third party](https://aitoolsatlas.ai/tools/skyfire/pricing)); Vouched $20 a month for 1,000 checks (search summary) |
| 9 | [Visa TAP, Mastercard Agent Pay](https://eco.com/support/en/articles/15192003-mastercard-agent-pay-vs-visa-trusted-agent-2026-compared) | Indirect, network standards | Agent verification and tokenized agent credentials | No merchant fee found |
| 10 | [Eventus Validus](https://www.eventus.com/market-risk/), [TT](https://www.financemagnates.com/institutional-forex/new-trading-technologies-tool-lets-traders-see-margin-impact-before-hitting-buy/), [CoinRoutes](https://coinroutes.com/academy/does-coinroutes-have-pre-trade-risk-controls/) | Indirect, pre-trade risk | Pre-trade limits and monitoring inside trading platforms | Bundled or not public |
| — | The broker's own rules ([Robinhood](https://forkast.news/robinhood-gave-ai-agents-a-trading-account-and-a-credit-card-the-liability-gap-just-got-wider/)) | Substitute | A separate agent account capped at deposited funds, one-tap disconnect, and terms that put the risk on the customer | Engineering time |

**Price range (public numbers only).** Lowest: free (three open-source gateways). Published paid points: $20 a month
(identity checks only) and $499 a month (a general MCP gateway). Median: not meaningful from three numbers. Every
finance-specific or enterprise offer is "contact sales". Gate's $1,500 a month Growth plan sits **3× above the only
published gateway price** and is the only one that names trading and payment controls.

## 2. Gate: the map

Axes that matter to a broker's compliance officer: **how finance-specific the controls are** (generic prompt and
tool guardrails → order- and payment-aware limits) and **how much it proves to a supervisor** (logs → evidence
under the supervisor's headings).

```
                         proves to a supervisor
                                  ▲
                                  │            [ Gate, as planned ]
                     AIUC (audit, │
                     insurance) ● │
                                  │   ● Alinia (MiFID II guard; LLM outputs)
   generic ───────────────────────┼──────────────────────────────────► finance-specific
                                  │
   Runlayer ● Archestra ●         │      ● Eventus / TT / CoinRoutes
   Lasso ● Invariant ●            │        (pre-trade limits, not agent identity)
   TrueFoundry ●                  │
                                  │   ● broker's own rules (risk on the customer)
```

## 3. What their customers complain about

No public reviews exist for these enterprise vendors (thin, under three per theme, for every one). The complaints
that are public concern **the substitute**, agent trading at brokers:

| Theme | Evidence |
|---|---|
| The customer carries all the risk | Robinhood's disclosures: customers "assume all risk" for orders their agents place; it does not supervise or audit connected agents ([Finder](https://www.finder.com/investments/ai-trading-agent-liability), [Forkast](https://forkast.news/robinhood-gave-ai-agents-a-trading-account-and-a-credit-card-the-liability-gap-just-got-wider/)) |
| Agents misread instructions or act on stale data | Robinhood's own warning, as reported ([Finder](https://www.finder.com/investments/ai-trading-agent-liability)) |
| Nobody knows who is accountable | No established dispute or liability framework for agents acting outside user intent ([Finovate](https://finovate.com/robinhood-lets-agents-trade-stocks-and-make-payments/)); FINRA's 2026 report flags agent risks ([Developments Today](https://developmentstoday.com/ai-robotics/robinhood-opens-stock-trading-to-ai-agents-raising-risk-questions)) (thin) |
| Developer friction | Developers criticised the MCP server's API completeness and the single agent workspace ([hyper.ai](https://hyper.ai/en/stories/e75f10e9fc1879971d3fbcf8a30b34b3)) (thin) |

The MCP-security comparisons found no vendor covering "order limits, kill switches, or broker-API permissions"
(search summary of [Aembit's list](https://aembit.io/blog/top-9-mcp-security-platforms-and-gateways-in-2026/) and
[MintMCP's](https://mintmcp.com/blog/mcp-gateways-cybersecurity-companies)); absence in a search is a lead, not proof.

## 4. The app: who is there

| Competitor | Type | Price | Note |
|---|---|---|---|
| [Robinhood Agentic Trading](https://fortune.com/2026/09/29/robinhood-trading-agents-hood-openai-anthropic/) | Direct | No agent fee found; [Gold $5 a month](https://www.firstcard.app/learn/betterment-vs-robinhood) | Real stock trades in a dedicated account **without manual approval**; rolled out to its customer base (figures differ by source) |
| [Public.com AI agents](https://itbrief.news/story/public-rolls-out-ai-agents-to-automate-trading-strategies) | Direct | [Listed as free](https://toolradar.com/tools/public) | Launched 2026-03-31; agents monitor markets and execute trades |
| [Composer](https://www.moneycrashers.com/composer-trade-review/) | Indirect | $40 a month or $384 a year | AI-built strategies, backtests, automation |
| [Robo-advisers](https://www.nerdwallet.com/investing/best/robo-advisors) | Indirect | 0.25% a year (about $25 per $10k) | Managed portfolios, no agent |
| Chatbot + broker app ([Finder](https://www.finder.com/investments/ai-trading-agent-liability)) | Substitute | A chatbot plan | Advice in chat, trades by hand |

**Price range for the app's job:** $0 (agents built into Robinhood and Public) to $40 a month (Composer); robo fees
of 0.25% are about $10 a month at $50,000 invested. The two brokers giving agents away free are the anchor.

## 5. The gap

- **Gate.** Generic MCP gateways are crowded, well funded and partly free. Pre-trade risk tools exist but know nothing
  about which agent is acting. Nobody found in this search sells **agent-identity-aware order and payment controls
  with supervisor-ready evidence** to the mid-size brokers and venues opening MCP. The clearest buyer pain on record is
  the liability gap at the brokers themselves. That gap is real only if the broker, not just its customer, feels it,
  which the board also doubted: the interviews decide.
- **The app.** The two largest players already give agents away free inside the broker. What they leave is **per-order
  approval and a record**: Robinhood's agents trade without manual approval and the customer carries the risk. A
  bounded agent with approvals is a feature a broker can add in a sprint, so it is a weak gap for a standalone app and a
  strong demo for Gate (it is the control a broker would buy).
- **Market size:** not established. How many mid-size brokers, venues and neobanks have opened MCP access is an open
  question for the interviews and the research doc (the board's sizing condition is not met).

## 6. The threat

1. **Runlayer** ($30M): one finance policy pack away from Gate's pitch, with an enterprise sales team already.
2. **Alinia**: already sells to a bank under a finance banner; moving from output checks to order-path checks is a
   short step.
3. **The brokers and platform vendors themselves** (Robinhood, Trading Technologies, Modulus): they own the order
   path and can add agent-aware limits as a feature.
4. **Card networks**: Visa and Mastercard make identity a free standard, which removes identity as a paid layer but
   also makes multi-standard verification a reason to buy a neutral verifier.
