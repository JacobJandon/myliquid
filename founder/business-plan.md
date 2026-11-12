# MyLiquid · Business plan

**Verdict: Not yet**

- ✓ Each paying customer-month earns $1426.20 before fixed costs (95% contribution).
- ✗ Year 1 operating LOSS: $570,249.
- ✗ 4 of 100 simulated buyers buy (4%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $1500.00 a paying customer-month |
| Profit margin at plan | -176% per paying customer-month |
| Break-even | 38 paying customer-months a day |
| Year 1 operating profit | $-570,249 |
| Startup spend | $100,000 |
| Cash needed before it pays for itself | $670,249 |
| Startup money earned back | not in year 1 |
| Buyer panel | 4 buy · 96 pass |

## The idea

- What it is: a runtime governance layer for AI agents that trade and pay with real money (**MyLiquid Gate**). Before
  an agent's trade or payment executes, it checks who the agent is, decides what it may do from that identity, the end
  customer's mandate and the firm's rules, sends anything bigger to a human, keeps tamper-evident evidence of every
  decision, and can stop every agent at once. A consumer app (an AI agent with a Tamagotchi-style pet that invests,
  rebalances and pays within the user's limits) is the reference deployment, the sales demo and the consumer beachhead.
- Who it is for: the paying customer is the head of product, CTO or chief compliance officer at a mid-size broker,
  crypto venue or neobank that is opening customer accounts to AI agents; then trading-platform vendors and agentic
  trading startups. The app's beachhead is agent-curious self-directed investors (invest monthly in a broker app,
  already ask ChatGPT or Claude about money, $5k to $250k invested).
- What it sells, at what price: Gate, priced per governed action (reads are free). Developer: free, 10,000 governed
  actions a month. Growth: $1,500 a month for 1M governed actions, then $1 per extra 1,000. Enterprise: $60,000 to
  $250,000 a year. Agent certification: $499 per agent a year. The consumer app is free today on demo money; a paid
  subscription ("MyLiquid Plus", price not set) is planned only after real money arrives through licensed partners.
- Where and how: online, US first (Delaware C-corp recommended, not yet incorporated). Gate is delivered as a hosted
  decision API, an SDK and an MCP guardrail proxy that sits in front of a broker's existing MCP server with no code
  change on their side. Customers come from a free six-month design-partner programme, an open-source proxy,
  compliance content and agent-trading hackathons. The app is an installable web app and an Android APK.
- Budget and constraints: a lean first 12 months of about $710,000, to be raised as a $750k to $1M pre-seed SAFE
  after design partners sign. Solo founder today (co-founder search planned). No customer funds held, no investment
  advice before an adviser registration exists, no SOC 2 report yet. Year-1 target: about $480,000 ARR by month 12.
  Source: `docs/startup/plan.md` (2026-10-02, status 2026-10-19) and `docs/discovery/`.

## Summary

**Verdict: Not yet.** Two checks fail, and neither is close. What has to change:

1. **Buyers.** 4 of 100 simulated decision-makers would take the free pilot (4%; the bar is 25%), and the offer's
   re-test with a paid Shadow Pilot reached 2 of 20 (10%). Trust, not price, is why they pass (47 of 96; price, 1).
   → `/founder-offer` has already changed the offer once; the next change comes from real buyers, through the
   three-paid-pilot test in `/founder-launch`.
2. **Year 1.** It loses **$570,249**: fixed costs of $52,869 a month need 38 paying customers, and the plan reaches
   13 by month 12. → `/founder-cfo`: hire against signed customers (break-even 21, cash $378,817) and sell the
   Enterprise mix the plan assumes (break-even 11 when lean as well).

**The business.** MyLiquid Gate decides whether an AI agent may make a trade or payment and keeps the proof, for
mid-size brokers and crypto venues that opened access to agents this year. The consumer app stays a free demo: 0 of
100 simulated investors would sign up for the paid plan, and the price they would accept is $2 to $12 a month.

**The three numbers.** Each paying customer leaves **$1,426.20 a month (95%)** after its own costs. Break-even is
**38 paying customers**. Year 1 is a **$570,249** operating loss.

**Where the board and the panel agree.** Trust comes first: no SOC 2, no customers, one founder, and a product that
sits in the order path. Both want one product for one buyer and a price agreed before any pilot. **Where they
differ.** The board's sharpest worry is that Gate is easy to copy; the panel barely mentions competitors and talks
about vendor risk and timing (21 waiting for regulation or a peer to move first).

**The biggest risk** is that no firm feels this is its own problem yet. What we do: a pilot that cannot hurt them
(replay mirrored logs out of band, nothing in the order path), a security packet before the first call, and a
paid test before any hire.

**What it takes to start.** $670,249 of cash before it pays for itself on the full plan, $378,817 lean. The first
test: **3 paid Shadow Pilots at $1,500 by 18 January 2027**, from 40 named firms.

**This week.** Incorporate and open the bank account, book the lawyer for the vendor-path opinion, and name the 40
firms. The shadow replay tool ships in the repo now.

The panel is simulated buyers and the numbers are projections; real customers and real quotes confirm them. Not
financial, legal or tax advice.

## What the board said

**Vote: 2 fund if, 1 pass. Average score 4.0 / 10** (Offers 4 FUND IF · Product 4 FUND IF · Monopoly 4 PASS).
The members' memos are in `board/` (offers.md, product.md, monopoly.md); the brief they read is `board/brief.md`.
They apply published frameworks; they are not the people those frameworks come from.

### The risks more than one member raised

1. **No focus: four products, four buyers.** All three. Gate, the consumer app, Arena and AINRA compete for one
   founder's time; the consumer demo is the most finished piece while the buyer's product (tenancy, firm console,
   policy authoring) is the least. Every member asks for one product for one buyer.
2. **Nobody has said yes, or even been asked.** All three. No interviews, no design partner, no price ever quoted
   to a buyer. The Offers lens fears the pain may not belong to the broker while terms push agent risk onto the
   customer; the Monopoly lens counts 13 paying firms needed in year one from zero conversations.
3. **Trust and identity.** All three. The only passport Gate reads today comes from a registry the founder started;
   no SOC 2, one founder, capped liability. Product: fail-closed means agents without an AINRA passport are held for a
   human, which a broker won't accept at volume. (Note from the chair: in the code, unidentified keys are sent to
   approval rather than refused; the point stands that this throttles them.)
4. **Gate sits in someone else's order path.** Offers and Product. Its outage becomes the broker's; the delay it adds
   and its behaviour when unreachable are not stated.
5. **Copyable, in a funded field.** Monopoly (lead), Offers. Rules engine, identity check, log and kill switch are
   well understood; Runlayer, Archestra, AIUC and the platform vendors can reach the same buyer.

### Where they disagree

- **Is there a market today?** Offers: buyers with money and a regulatory push, so the market is real if the pain is
  owned. Monopoly: no small market is named or sized, so pass until one is.
- **Is the open-source proxy a strength?** Offers and Product like the zero-code entry. Monopoly says it gives the
  on-ramp away unless something closed compounds behind it.
- **What is the moat?** Monopoly sees one candidate (the cross-firm agent record, if many firms share it); Offers
  sees the moat in the offer itself (evidence an examiner accepts); Product in owning the first five minutes.

### Conditions, merged (the rest of the pack tests what it can)

- [ ] **One product, one buyer:** Gate (proxy + decision record) for mid-size brokers and crypto venues opening MCP
      access to agents. Consumer app frozen as a demo; Arena and the agent card shelved. *(all three)*
- [ ] **Discovery:** the 20 interviews; most broker/venue interviewees call it their own problem, with a named budget
      owner. *(Offers, Product)* → `/founder-consumer` gives a simulated first read; real interviews confirm.
- [ ] **A price signed before the pilot:** at least two (Offers) or three (Monopoly) design partners on a paid pilot or
      an LOI at a stated price. → `/founder-pricing`, `/founder-launch`
- [ ] **A named, sized small market** with its firm count and an 18-month share. *(Monopoly)* → `/founder-competitors`
- [ ] **The copycat answer:** the advantage that grows with each firm and how it stays closed. *(Monopoly)*
- [ ] **A stack on the buyer's path, with a guarantee:** readiness assessment, ready policies and supervisory
      procedures, exam-ready evidence pack, help through the vendor security review; e.g. no fee if the evidence pack
      fails their internal audit review. *(Offers)* → `/founder-offer`, priced by `/founder-cfo`
- [ ] **The buyer's side built first:** tenancy, firm console, policy authoring; the first five minutes proven
      without the founder in the room. *(Product)* → `/founder-ops`, `/founder-launch`
- [ ] **The identity seam fixed:** one adapter beyond AINRA, or a tier for unidentified agents with tight limits.
      *(Offers, Product)*
- [ ] **Numbers on the order path:** measured delay and stated down-behaviour, in the contract. *(Product)*
- [ ] **A trust plan:** SOC 2 timeline, AINRA under separate governance. *(Offers)*
- [ ] **Someone who has sold to regulated financial firms** on the team. *(Monopoly)*

### The strongest version the board can see

Not what was pitched. A single product: **an exam-ready control layer for mid-size brokers and crypto venues that
opened MCP access to AI agents this year.** One sentence, as Product put it: *Gate decides whether an AI agent may
make a trade or payment, and keeps the proof.* It is sold to the compliance officer as the evidence a supervisor will
ask for (SAFR and FINRA headings), installed by the engineer in a day through the proxy, with a paid pilot priced up
front and a guarantee tied to the evidence passing review. Identity is multi-standard from the first customer, with
AINRA as one verifier among several. The consumer app becomes what it already is best at, the live demo, and gets no
new features until a broker pays. The durable asset to build toward is the cross-firm record of how each agent
behaves, which no single broker can produce about itself.

## The competition

Two markets, because MyLiquid sells to two buyers: **Gate** (brokers, venues and neobanks letting AI agents act on
customer accounts) and **the app** (agent-curious self-directed investors). Every fact links to its source in
`competitors.csv`.

**How this was researched (2026-11-12).** Web search only. Opening the vendors' own pages from this session was
blocked by its network policy, so most facts come from search summaries of press, listings and comparison sites, not
the vendors' price pages. Treat prices as leads to confirm. Enterprise vendors publish almost no prices and have no
public reviews, so the complaints section is thin; that is a finding in itself.

### 1. Gate: who is there

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

### 2. Gate: the map

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

### 3. What their customers complain about

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

### 4. The app: who is there

| Competitor | Type | Price | Note |
|---|---|---|---|
| [Robinhood Agentic Trading](https://fortune.com/2026/09/29/robinhood-trading-agents-hood-openai-anthropic/) | Direct | No agent fee found; [Gold $5 a month](https://www.firstcard.app/learn/betterment-vs-robinhood) | Real stock trades in a dedicated account **without manual approval**; rolled out to its customer base (figures differ by source) |
| [Public.com AI agents](https://itbrief.news/story/public-rolls-out-ai-agents-to-automate-trading-strategies) | Direct | [Listed as free](https://toolradar.com/tools/public) | Launched 2026-03-31; agents monitor markets and execute trades |
| [Composer](https://www.moneycrashers.com/composer-trade-review/) | Indirect | $40 a month or $384 a year | AI-built strategies, backtests, automation |
| [Robo-advisers](https://www.nerdwallet.com/investing/best/robo-advisors) | Indirect | 0.25% a year (about $25 per $10k) | Managed portfolios, no agent |
| Chatbot + broker app ([Finder](https://www.finder.com/investments/ai-trading-agent-liability)) | Substitute | A chatbot plan | Advice in chat, trades by hand |

**Price range for the app's job:** $0 (agents built into Robinhood and Public) to $40 a month (Composer); robo fees
of 0.25% are about $10 a month at $50,000 invested. The two brokers giving agents away free are the anchor.

### 5. The gap

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

### 6. The threat

1. **Runlayer** ($30M): one finance policy pack away from Gate's pitch, with an enterprise sales team already.
2. **Alinia**: already sells to a bank under a finance banner; moving from output checks to order-path checks is a
   short step.
3. **The brokers and platform vendors themselves** (Robinhood, Trading Technologies, Modulus): they own the order
   path and can add agent-aware limits as a feature.
4. **Card networks**: Visa and Mastercard make identity a free standard, which removes identity as a paid layer but
   also makes multi-standard verification a reason to buy a neutral verifier.

## The buyer panel

**4 buy · 96 pass** (4% buy) out of 100 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Crypto venue | 25 | 8% |
| Mid-size retail broker | 35 | 6% |
| Agentic trading startup | 8 | 0% |
| Trading-platform vendor | 12 | 0% |
| Neobank or fintech with investing | 20 | 0% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Early adopter | 12 | 33% |
| Compliance-led | 18 | 0% |
| Builds in-house by default | 18 | 0% |
| Waits for regulation | 14 | 0% |
| Vendor-risk cautious | 12 | 0% |
| Fast follower | 14 | 0% |
| Budget-squeezed | 12 | 0% |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $304,000 and up | 34 | 6% |
| under $219,000 | 33 | 3% |
| $219,000 to $304,000 | 33 | 3% |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 47 | "I won't put an inline proxy from a startup with no customers and no SOC 2 report in front of our order path, even for free. If it goes down or gets breached, our trades stop and I'm the one explaining it to FINRA." (P001) · "I won't put a startup without a SOC 2 report in our order path, and this one has no customers and only a planned audit. Nothing in writing from FINRA or the SEC makes me need agent-level pre-trade controls yet, so it's not going into next year's budget." (P003) |
| timing | 21 | "Our agent volume through the MCP server is tiny today, and no regulator has written a rule or brought an enforcement action that says I need a separate agent-identity and approval layer. I'm not putting a proxy in front of customer trades, or signing a letter of intent with a price in it, on the strength of speeches and reports." (P004) · "I like being first, but our agent volume is tiny today and my engineers already rate-limit every API key, so there's nothing here I'd pay for this month. At our volume we'd sit inside the free tier anyway, and I won't sign an LOI naming a price for a problem we don't have at scale yet." (P005) |
| need | 20 | "My team already rate-limits every key and could build caps, an approval queue and a kill switch for agent accounts inside a quarter, and no regulator is asking me for this yet. I don't buy what I can build, especially not something that sits in my order path." (P011) · "Our agent volume is tiny today, and a proxy that checks caps, routes big orders to a human and has a kill switch is something my team can build in a quarter on top of controls we already run. I'll answer the examiner's AI question with our own policy and logs, not a vendor with no customers sitting in the trade path." (P013) |
| habit | 7 | "Identity check, per-customer caps, a human-approval queue and a kill switch in front of our own order path is a quarter of work for my team, and with a competitor already live we'd rather own that layer than rent it. I'd take the demo call to steal the checklist, not to sign." (P002) · "A policy check in front of our MCP server, an approval queue, a kill switch and a hash-chained log are things my team can build in a quarter, and we'd rather own anything that sits in the trade path. I'm not putting a startup with no customers and no SOC 2 in front of order execution, and I'm not signing an LOI with a price on it just to get six free months." (P009) |
| price | 1 | "I'm building next year's budget right now and this isn't in it. A metered tool from a startup with no customers loses to a headcount line every time. At most I'd let my engineers poke at the free Developer tier. That isn't buying." (P090) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 3 | "We opened our MCP server to customers' agents this year, and I have nothing between an agent's call and an executed trade except our own caps, so I'd take the free design-partner slot and run it in shadow mode on a slice of traffic. That's a pilot, not a budget line yet. Whether we pay comes down to what the six months show." (P012) · "We're letting customer agents onto the venue and right now our controls are rate limits plus hope, so I'd take the free design-partner slot and run it in shadow mode next to the order path. I'd sign the LOI only if the price has a ceiling. Paying the Growth tier comes after it proves itself, and it goes into next year's budget as a line item conditional on the pilot." (P062) |
| timing | 1 | "A competitor announced agent trading last month, and a free six-month pilot with no code change gets us a governed answer in weeks instead of the quarters my own team would need. I'd sign up as a design partner in a sandbox, but that's a pilot, not a production commitment." (P076) |

### What would flip a no

- A FINRA examiner asking us how we control and evidence AI agent trading, and we can't answer. That plus a finished SOC 2 Type II report would get it onto my desk.
- A comparable broker running it in production with a finished SOC 2 Type II, so I'm not the guinea pig and it beats what my team ships in a quarter.
- A FINRA or SEC rule or enforcement action that requires agent-level pre-trade controls, with a finished SOC 2 Type II report from them by then.
- A FINRA or SEC rule, notice with teeth, or enforcement action that specifically names AI-agent authorization and supervision for customer accounts, plus a finished SOC 2 Type II.
- Agent-initiated trades becoming a real share of our order flow, or our regulator asking how we control customer agents, plus a finished SOC 2 report so the proxy can pass vendor review.
- Gate checking agents against a Know-Your-Agent standard the founder doesn't control, or AINRA handed to an independent body. With that I'd run the design-partner pilot in shadow mode right away.
- A completed SOC 2 Type II report plus two or three reference brokers already running it in production, with published latency numbers and a fail-open or bypass mode we control. Then I'd look at the design partner pilot for next year's budget.
- An examiner or auditor asking us to show how we identify, authorize and supervise customer AI agents before their trades execute, when we can't produce that evidence ourselves.
- If our regulators or exchange partners started requiring a verified Know-Your-Agent check like AINRA passports that we couldn't realistically build and maintain ourselves, and the vendor had a finished SOC 2 Type II plus a broker already running it in production.
- A completed SOC 2 Type II report plus two or three named broker-dealer references running it in production. Then I'd let it through vendor review, likely in a fail-open, observe-only mode first.
- FINRA or the SEC making agent identity checks and decision evidence an explicit exam expectation, so the passport verification and export formats become something I can't credibly build and keep current myself.
- Agent-originated orders becoming a real share of our flow while an examiner or FINRA explicitly expects know-your-agent controls we can't stand up in a quarter, with a completed SOC 2 and a peer broker already running it in production.

Buyers say they would buy **1.0 times** in the first month on average.

100 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Three inputs: what 100 simulated buyers said (`pricing-curve.md`, `pricing-curve-app.md`), what competitors charge
(`competitors.md`), and what the business needs (`cfo.md`, run at each candidate price). Simulated price answers pick
what to test; they prove nothing.

### Gate

| | Price a month |
| --- | ---: |
| Too cheap below (PMC) | $518 |
| Least resistance (OPP) | $1,048 |
| As many say bargain as expensive (IPP) | $2,501 |
| Too expensive above (PME) | $7,976 |
| Panel medians: too cheap · bargain · getting expensive · too expensive | $300 · $1,000 · $5,000 · $12,000 |

- **Competitors.** The only published gateway price is $499 a month (a general MCP gateway); three gateways are free and
  open source; every finance-specific or enterprise vendor is "contact sales" (`competitors.md` §1).
- **What it earns (from the CFO tool).** At $1,500 each paying customer-month leaves $1,426 (95%) and break-even is 38
  paying customers. At $1,000: 58. At $2,500: 22. At the plan's blended price of $2,692 (Growth and Enterprise mixed):
  21; with no engineer or BD hire until customers pay, 11.

**1. The price: keep Growth at $1,500 a month.** It sits inside the acceptable range, between least resistance and
the indifference point, and 3× the only published gateway price, which is right for the only offer that names
trading and payment controls. Price is not why buyers said no: only 1 of 96 passes gave price as the reason (trust 47,
timing 21, need 20, habit 7). Dropping it to $1,000 would need 20 more customers to break even and win nobody.

**2. The ladder.**

| Rung | Price | Reason to step up |
| --- | --- | --- |
| Developer (self-hosted proxy) | Free | Run the proxy in your own network (planned open-source release; no licence published yet); limits and a kill switch, no identity or evidence |
| **Shadow pilot** (new) | $1,500 once, 60 days, credited to year 1 | Gate watches a copy of real agent traffic and records what it would have done; you get the exam pack. Answers "not in my order path yet" |
| Growth | $1,500 a month | Enforce in the order path, every adapter, evidence export, kill-switch API |
| Enterprise | $60,000 to $250,000 a year | Volume pricing, on-prem, SSO, SLA, SOC 2 report, custom policies |

**3. The opening offer.** Five design-partner slots (true, from the plan): the Shadow pilot at $1,500 credited in full,
with the Growth price fixed for 24 months. Buyers asked for a ceiling before signing an LOI (P062). No discount that
trains buyers to wait; the slots end when five firms sign.

**4. What to test with real buyers.** Two prices inside the range on the design-partner call sheet: $1,500 and $2,500
a month for Growth, each with the paid Shadow pilot. Record which is accepted, countered or refused, and why.

**5. The panel's price objections, verbatim (for marketing).**
- "A metered tool from a startup with no customers loses to a headcount line every time." (P090)
- "At our volume we'd sit inside the free tier anyway, and I won't sign an LOI naming a price for a problem we don't
  have at scale yet." (P005)
- "I'd sign the LOI only if the price has a ceiling." (P062)

### The app (MyLiquid Plus)

| | Price a month |
| --- | ---: |
| PMC · OPP · IPP · PME | $2.04 · $3.02 · $5.04 · $11.97 |
| Panel medians: too cheap · bargain · getting expensive · too expensive | $1 · $3 · $8 · $15 |

0 of 100 investors would join the waitlist for a paid real-money plan at any price; price was the reason for 20 of
them, trust for 60. Competitors give agents away inside the broker (Robinhood, Public) or charge $40 a month (Composer);
robo-advisers charge 0.25% a year. **Recommendation: no consumer price.** The app stays free on demo money, as the board
also recommended. If a consumer price is ever tested, test $3 and $5 a month, and only once a licensed broker is named.

No "was $X" anchors, no below-cost pricing anywhere.

## The offer

Method: the Offers lens (`board/` and the founder-board lenses file), applied to what 100 simulated buyers said
(`panel/results.md`) and what competitors' customers complain about (`competitors.md`). Costs from `cfo.md`.

### 1. The problems, in the buyer's words (from the panel and the competitor map)

Before buying
1. "I won't put a startup without a SOC 2 report in our order path." (47 of 96 passes were trust)
2. "No customers, no references: I'd be the guinea pig."
3. "Another hop in the order path means latency and a new point of failure."
4. "If it goes down or gets breached, our trades stop and I'm the one explaining it to FINRA."
5. "No regulator requires this yet." (21 were timing)
6. "Our agent volume is tiny today."
7. "My team can build caps, an approval queue and a kill switch in a quarter." (20 need, 7 habit)
8. "The identity registry was started by the vendor's founder: grading its own homework."
9. "Per-action pricing is hard to budget." / "I'd sign the LOI only if the price has a ceiling."
10. "A free pilot still costs my engineers' time and a public reference."
11. "Our terms already put agent risk on the customer." (competitor map: Robinhood's disclosures)

During
12. "What happens to agents already calling us without a passport?"
13. "Who is the person when it asks for approval, and how long does the order wait?"
14. "Who writes the policies, and where?"
15. "How do I show my committee what it would have done before it does anything?"

After
16. "Will an examiner accept the evidence?"
17. "What if you disappear? It's in my trade path."
18. "Will the price jump after the pilot?"

### 2. Solutions, scored (value to buyer 1-5, cost to deliver 1-5, 1 = cheap)

| # | Solution | Answers | Value | Cost | Keep |
| --- | --- | --- | ---: | ---: | --- |
| A | **Shadow mode, out of band**: replay a mirrored copy or log of agent calls through Gate; it never sits in the order path | 1, 3, 4, 10, 15 | 5 | 1 (built in this round: `scripts/gate-shadow.ts`) | ✓ core |
| B | Self-host the proxy in your own network when you enforce | 3, 4, 17 | 4 | 1 (exists) | ✓ |
| C | API-key identity first; AINRA optional | 8, 12 | 4 | 1 (exists: unidentified keys only propose) | ✓ |
| D | Exam pack: decision log with evidence hashes + each control mapped to FINRA / MAS SAFR | 16 | 5 | 2 (mapping exists for the app; per-firm report needs tenancy) | ✓ bonus |
| E | Vendor security packet: architecture, data flows, threat model, SOC 2 timeline | 1, 2 | 4 | 2 (documents; threat model is on the plan) | ✓ bonus |
| F | Paid pilot, refunded if the exam pack fails their compliance review | 10, 16 | 4 | 2 ($1,500 at risk per pilot) | ✓ guarantee |
| G | Growth price fixed for 24 months | 9, 18 | 3 | 1 | ✓ |
| H | Flat Growth price shown as "up to 1M actions" | 9 | 3 | 1 | ✓ wording |
| I | SOC 2 Type II before selling | 1 | 5 | 5 ($60k and 6 to 12 months) | later: Type I first |
| J | A production reference | 2 | 5 | 5 (needs a customer) | comes from the pilots |
| K | Written supervisory procedure template for agent access | 13, 14 | 3 | 3 (needs the fractional CCO) | later |
| L | Latency numbers published | 3 | 3 | 1 (measure the proxy) | ✓ before first pilot |

### 3. The stack

- **The core: the Shadow Pilot.** "Find out what your customers' AI agents would have done under your rules, before
  anything sits in your order path." Gate replays a mirrored copy of agent calls and reports what it would have
  allowed, sent to a person, or refused. When you are ready, the same rules enforce through a proxy you host.
- **Bonus 1, the exam pack** (kills "will an examiner accept it?"): every decision with its evidence hashes, each
  control mapped to FINRA's and MAS SAFR's expectations.
- **Bonus 2, the vendor security packet** (kills "no SOC 2"): architecture, data flows, threat model, the SOC 2
  timeline with dates. Says plainly what is not done.
- **The guarantee:** 60 days for $1,500, credited to year one, **fully refunded if the exam pack does not pass your
  compliance team's review.** Cost at a 30% claim rate (estimate): $450 per pilot, $2,250 across five; worst case
  $7,500. Affordable against `cfo.md`'s $670k cash need.
- **Real urgency:** five design-partner slots (the plan's number), Growth price fixed for 24 months for those five.
- **The name:** *MyLiquid Gate Shadow Pilot.*

### 4. Value equation (1-10, before → after)

| Element | v1 (free six-month design partner) | v2 (Shadow Pilot) | What moved it |
| --- | ---: | ---: | --- |
| Dream outcome | 6 | 7 | The exam pack names the outcome: an answer for the examiner |
| Perceived likelihood | 2 | 4 | Refund tied to their own compliance review; security packet; still no SOC 2 or reference |
| Time to result | 4 | 7 | A report from replayed traffic in days, not a six-month integration |
| Effort and sacrifice | 3 | 6 | Nothing inline, nothing leaves the network, API keys only, no LOI before results |

### 5. The re-test (same seed, 20 buyers, `panel-offer/`)

| | v1, 100 buyers | v2, 20 buyers |
| --- | ---: | ---: |
| Buy | **4%**, all four a *free* shadow trial | **10%**, both a *paid* $1,500 pilot |
| Trust as the reason for passing | 47% | 50% |
| Need + habit ("we'll build it") | 27% | 25% |
| Timing | 21% | 15% |

What moved: buyers who said yes now pay, and the per-action-pricing objection disappeared ("the flat monthly price
also fixes my usual worry about budgeting per-action fees", P013). What did not: trust. The most repeated way to flip
a no was new and specific: **"a shadow mode that reads a mirrored copy of the traffic instead of sitting inline"**
(P003, P010, and three more). v2's pitch still said "in front of the MCP server". So the core is now out-of-band
replay, built in `scripts/gate-shadow.ts`, and the pitch says so. The rest of the trust gap closes only with a SOC 2
report and a reference, which the pilots exist to produce. Twenty buyers is a small sample; treat 4% → 10% as
direction, not proof.

## The numbers

> Reading the tables: the tool counts units a day. Here one unit is **one paying customer for one month** and a "day"
> is a month (`days_per_month: 1`), so "38 a day" means 38 paying customers. Inputs and sources: `numbers.json`,
> `cfo-sources.md`. Not financial, tax or legal advice: an accountant should check the structure, payroll and tax
> before money moves.

- **The margin.** Each paying Growth customer leaves **$1,426.20 a month (95%)** after its own costs. The business
  margin at the plan's 13 customers is **−176%**: fixed costs of $52,869 a month need **38 paying customers** to break
  even. Year 1 loses **$570,249** on operations ($670,249 after the $100,000 startup spend).
- **The line to watch: the ramp.** The plan reaches 13 paying customers by month 12. The 100-buyer panel had 4 who
  would take a free pilot and none who would pay today. At 30% of the plan's ramp, year 1 loses $615,174. Unit costs
  barely matter (+15% moves year 1 by $498); price and customer count are everything.
- **Cash.** **$670,249** before it pays for itself, inside the plan's $750k to $1M pre-seed. Raise only after the
  board's condition holds: letters of intent with a price.
- **Three ways to improve the margin (each run through the tool):**
  1. *Hire against signed customers, not the calendar.* Without the engineer and BD lead until customers pay, fixed
     costs fall to $28,583, break-even to **21** customers, cash needed to **$378,817** (`numbers-lean.json`).
  2. *Sell the mix the plan assumes.* At the plan's blended $2,692 a customer (Enterprise with Growth), break-even is
     21; lean as well, **11**, which the plan's month-12 count of 13 would clear.
  3. *Charge for the pilot.* A $1,500 Shadow pilot brings cash forward and tests willingness to pay months earlier;
     it changes the ramp, not the unit margin, so it is the test that de-risks every number above.
- **The board's money conditions.** "A price signed before the pilot": not met yet (the offer adds a paid pilot).
  Cash fits the planned raise: met, if the raise happens.

---

## Unit economics: MyLiquid Gate (Growth plan)

Every number below comes from the input file. Nothing is looked up or guessed.

### One paying customer-month

| line | per paying customer-month |
| --- | ---: |
| Price | $1,500.00 |
| Card processing on a $1,500 invoice (2.9% + $0.30, research.md) [worst case; ACH is cheaper] | -$43.80 |
| Compute and database for 1M governed actions (estimate: plan says fractions of a cent per 1,000) | -$25.00 |
| Evidence storage and exports (estimate) | -$5.00 |
| **Contribution** (what each paying customer-month leaves to pay the fixed costs) | **$1,426.20** (95%) |

### The margin that matters

Fixed costs: $52,869 a month (Two founders, below-market ($180k/yr, plan §8) $15,000, Founding engineer, loaded ($140k over months 3-12, plan §8) $14,000, Solutions/BD lead ($72k over months 6-12, plan §8) $10,286, Fractional CCO (plan §8) $4,000, Infrastructure, market data, Claude API ($30k/yr, plan §8) $2,500, Insurance: E&O, cyber, D&O ($25k/yr, plan §8) $2,083, Go to market: events, hackathons, design, travel ($50k/yr, plan §8) $4,167, SOC 2 compliance platform (~$10k/yr, research.md range $7.5-15k) $833).

- **Break-even: 38 paying customer-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (13 a day): **-176%** of every sale, after every cost.

### Year 1, month by month

| month | paying customer-months a day | revenue | profit | cumulative (after $100,000 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $0 | -$52,869 | -$152,869 |
| 2 | 0 | $0 | -$52,869 | -$205,738 |
| 3 | 0 | $0 | -$52,869 | -$258,607 |
| 4 | 0 | $0 | -$52,869 | -$311,476 |
| 5 | 1 | $1,500 | -$51,443 | -$362,919 |
| 6 | 1 | $1,500 | -$51,443 | -$414,362 |
| 7 | 2 | $3,000 | -$50,017 | -$464,378 |
| 8 | 4 | $6,000 | -$47,164 | -$511,542 |
| 9 | 6 | $9,000 | -$44,312 | -$555,854 |
| 10 | 8 | $12,000 | -$41,459 | -$597,314 |
| 11 | 10 | $15,000 | -$38,607 | -$635,921 |
| 12 | 13 | $19,500 | -$34,328 | -$670,249 |

- **Year 1 operating profit: -$570,249** on $67,500 of revenue.
- After the $100,000 startup spend: -$670,249.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$670,249**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | -176% | 38 | -$570,249 |
| Price -10% | -207% | 42 | -$576,999 |
| Volume -20% | -244% | 38 | -$583,085 |
| Unit costs +15% | -177% | 38 | -$570,747 |

### Red flags

- Year 1 loses money on operations (-$570,249).
- The startup spend is not earned back within year 1.

## Marketing

Built from the panel (`panel/results.md`, `panel-offer/results.md`), the competitor map, the offer and the CFO's
numbers. Panel quotes below are research; never use them in ads as customer quotes.

### 1. Positioning

The first audience is where the panel moved: **early adopters at mid-size brokers and crypto venues opening MCP access
this year** (33% of early adopters took the v1 trial, every other behaviour 0%; crypto venues 8%, brokers 6%,
neobanks, platform vendors and agentic startups 0%).

1. *For compliance and product heads at brokers and crypto venues letting customers' AI agents trade, who will be asked
   how they supervise those agents, MyLiquid Gate is the agent-control layer that shows what every agent would have
   done under your rules, without sitting in your order path, unlike rate limits or a generic MCP gateway.*
   **Recommended.** Evidence: the top flip condition was out-of-band shadow mode (5 of 18 re-test passes) and the top
   trigger was "an examiner asks" (repeated in both panels).
2. *…the control record an examiner will accept for customer AI agents…* Strong outcome, but no examiner has accepted
   it yet; we cannot claim it.
3. *…the identity-aware kill switch for customer AI agents…* True but the panel saw kill switches as a quarter's
   engineering ("we can build that"), so it does not separate us.

### 2. Channels (pick three; say no to the rest)

| Channel | Why it fits | Cost | Worked if |
| --- | --- | --- | --- |
| **Founder-led outreach to a named list of 40 firms** (brokers and crypto venues that opened MCP this year), warm intros first | The first market is a list of firms, not a crowd; the plan already asks for 20 interviews | Founder time | ≥ 10 conversations with a named budget owner in 4 weeks |
| **Compliance content**: the agent-readiness checklist and the FINRA / SAFR control mapping, posted where compliance officers read (LinkedIn, compliance newsletters) | Compliance officers are the internal champion; "examiner asks" is the trigger | $0 (organic) | ≥ 3 inbound requests for the mapping |
| **The shadow replay tool, free**: run it on your own logs | Kills "not in my order path" and "we can build it" in one go; a developer can try it in an hour | $0 | ≥ 5 firms run it on a sample log |

Not doing: paid search and paid social (18 buyers do not come from ads), events and booths (expensive, long cycle),
consumer marketing for the app (0 of 100 investors would join a paid plan; the app stays the demo).

### 3. The 30-day campaign (launch = Monday 7 December 2026, the design-partner programme opens)

Ten hooks, each answering one objection:

1. "Your examiner will ask how you supervise customers' AI agents. Here is what yours did last week." *(timing)*
2. "See what your agents would have done, without putting us in your order path." *(trust: inline)*
3. "Send a log, get a report. Nothing inline, nothing leaves your network." *(trust: data)*
4. "Rate limits tell you how often. Not who it was, or whether the customer allowed it." *(need)*
5. "Your terms move agent risk to customers. Will your examiner read them the same way?" *(liability gap)*
6. "$1,500 for 60 days, refunded if your compliance team rejects the exam pack." *(likelihood)*
7. "No passport needed. Start with the API keys you already issue." *(identity conflict)*
8. "One call stops every agent. When did you last test yours?" *(kill switch)*
9. "A quarter of engineering, or a 60-day pilot with the evidence already written?" *(build vs buy)*
10. "One flat price, fixed for 24 months. Five design-partner slots." *(pricing)*

| Date | Channel | What goes out |
| --- | --- | --- |
| Mon 23 Nov (L−14) | Outreach | Build the list of 40 firms; find the compliance and product owner at each |
| Tue 24 Nov | Content | Draft the agent-readiness checklist (one page) |
| Wed 25 Nov | Product | Shadow replay quick-start in `docs/GATE.md`; record a 2-minute screen capture |
| Thu 26 Nov | — | US holiday; nothing out |
| Fri 27 Nov | Outreach | First 10 warm-intro asks (advisers, Alpaca community, AINRA contacts), hook 4 |
| Mon 30 Nov | LinkedIn | Post: what Robinhood's agent disclosures say about risk, and what a broker must still evidence (hook 5) |
| Tue 1 Dec | Outreach | 10 cold emails to compliance owners, hook 1 |
| Wed 2 Dec | Content | Publish the FINRA / SAFR control mapping (hook 3) |
| Thu 3 Dec | Outreach | 10 emails to product/CTO owners, hook 2 |
| Fri 4 Dec | Calls | First discovery calls (the plan's interview guide) |
| Mon 7 Dec (**L**) | /business, LinkedIn, email | Design-partner programme opens: Shadow Pilot, five slots (hooks 6, 10) |
| Tue 8 Dec | LinkedIn | The 2-minute replay video (hook 3) |
| Wed 9 Dec | Outreach | Follow-ups to everyone from 1 to 3 Dec, hook 9 |
| Thu 10 Dec | Calls | Discovery calls; offer the free replay on a sample log |
| Fri 11 Dec | Review | Week 1 numbers (below) |
| Mon 14 Dec | Content | "What an agent-access control log should contain" (hook 4) |
| Tue 15 Dec | Outreach | 10 new firms, hook 7 |
| Wed 16 Dec | LinkedIn | Kill-switch drill post (hook 8) |
| Thu 17 Dec | Calls | Pilot proposals to every firm that ran a replay |
| Fri 18 Dec | Review | Week 2 numbers |
| 21 to 23 Dec | Outreach | Last follow-ups before the holidays; nothing new |
| (L+16 is 23 Dec) | | When there is nothing new to say: a replay report on MyLiquid's own demo traffic, the making of an evidence hash |

### 4. Budget and numbers

- **Budget for 30 days: about $1,500** of the plan's $50k a year go-to-market: $500 checklist design, $1,000 travel
  for on-site demos. No paid media (see channels). Outreach is founder time.
- **The most to pay for a customer.** A Growth customer leaves $1,426.20 a month (`cfo.md`). If one stays for the
  24-month price lock (an assumption, no retention data yet) that is $34,229; at a 3:1 lifetime-to-acquisition ratio,
  **about $11,400 per customer**. Founder-led sales costs far less in cash; time is the constraint.
- **Watch weekly:**
  1. Conversations with a named budget owner. Change something if fewer than 2 a week.
  2. Shadow replays run on a firm's own sample log. Change something if none by 18 December.
  3. Paid pilots signed. The launch test's bar: 3 by 18 January 2027.

## Brand

The name is **decided** (`docs/startup/plan.md` §12: MyLiquid for the company and the app, "Gate" and "Arena" as
product names). This section checks it rather than reopening it, and briefs the look and voice for Gate's buyer.

### 1. The name: checks to finish, and one risk

| Check | What to do | Status |
| --- | --- | --- |
| Trademark, US | [USPTO search](https://tmsearch.uspto.gov/) for MYLIQUID and MYLIQUID GATE in Class 9 (software), 36 (financial services), 42 (SaaS) | To run |
| Trademark, EU / UK | [EUIPO eSearch](https://euipo.europa.eu/eSearch/), [UKIPO](https://trademarks.ipo.gov.uk/ipo-tmtext), same classes | To run |
| Domain | myliquid.com and .ai, plus gate.myliquid.com for the product | Could not check from this session (network policy); check at a registrar |
| Handles | LinkedIn company page first (the B2B channel), then X and GitHub | To run |
| Confusion | No competitor in `competitors.md` uses "Liquid" | Clear |

**The risk.** "Liquid" was the name of a crypto exchange FTX bought in 2022, which
[halted withdrawals](https://decrypt.co/114666/liquid-global-halts-withdrawals-ftx-contagion-continues?amp=1) when FTX
failed ([acquisition](https://www.theblock.co/post/132746/ftx-liquid-acquisition-japan-crypto-exchange)). Crypto
venues are half of Gate's first audience, and a compliance officer may make that association. Mitigation without a
rename: lead B2B materials with the product name, **"Gate, by MyLiquid"**, and keep "liquid" meaning *liquidity you
can see* (the app's liquidity ladder), never "a liquid token". Alternatives if a trademark search fails, for the
founder to weigh, not adopted: *Gatekeep*, *Mandate*, *Tollgate*, *Kya Gate* (each needs the same checks). Public
searches only; a trademark lawyer confirms, and nothing is registered until it is filed.

### 2. Promise, taglines, voice

- **Promise (Gate):** *You will always know what every agent did on your customers' accounts, and why it was allowed.*
- **Taglines:** "Every agent action, decided and kept." · "Agent access, with the evidence." · "Let agents in. Keep
  the proof."
- **Voice: plain, exact, calm.**
  - Plain: do say "it never sits in your order path"; don't say "frictionless, seamless governance".
  - Exact: do say "SOC 2 audit planned, not started"; don't say "enterprise-grade security".
  - Calm: do say "an examiner may ask"; don't say "regulators are coming for you".
  - Before: "a runtime governance layer for AI agents". After: "Gate decides whether an AI agent may make a trade or
    payment, and keeps the proof."

### 3. The look (brief)

The system already exists: **Paper & Pixels 2** (`docs/design/rules.md`). For Gate's buyer, use its sober half: paper,
ink and blue; the lime highlighter at most once a page; no pet on `/business` (the board asked why a compliance demo
features a Tamagotchi).

| Colour | Hex | Job | Contrast |
| --- | --- | --- | --- |
| Ink | #111111 | Text, primary buttons | 17:1 on paper |
| Paper | #f5f3ee | Background | — |
| Liquid blue | #2f5bff | Links, focus, the primary button's shadow | 5.2:1 on white (AA) |
| Muted | #716e66 | Meta text only | 4.6:1 on paper (AA) |
| Lime | #c8f560 | Highlighter, one phrase a page | Ink on lime 15:1 |

Type: Inter Tight (display), Inter (text), Geist Mono (numbers), Silkscreen (pixel labels): all free on Google Fonts
under the SIL Open Font License. Logo: the living orb (`components/brand/LogoMark.tsx`) stays; for Gate add a
wordmark lock-up "Gate, by MyLiquid" that works at 32 px.

**The first five touchpoints:** (1) `/business`, opening on the shadow replay; (2) the shadow report a firm receives
after a replay; (3) the pilot invoice and receipt; (4) the first LinkedIn post (hook 5); (5) the reply to the first
complaint: within one business day, what happened, what we changed, in the voice above.

## Operations

What has to happen for the Shadow Pilot to run without the founder in the room (the board's Product condition), and
what it costs. Rules differ by place and change; the user confirms each licence with the authority or a professional.
Not legal advice.

### 1. The cycle (✱ = the customer sees it)

1. ✱ Intake call: who owns agent risk, which MCP server or API, a sample of agent-call logs (JSON lines).
2. ✱ Data terms signed: the log stays on the firm's side when they run the replay themselves; if they send it, a DPA.
3. Write the firm's policy file (caps, approval line, identity tiers) with them: `scripts/gate-proxy.example.json`.
4. ✱ Run the shadow replay (`scripts/gate-shadow.ts`) on the log: decisions log plus the shadow report.
5. ✱ Review call: what Gate would have allowed, sent to a person, or refused, and why; the exam-pack mapping.
6. ✱ Compliance review of the exam pack (the refund condition).
7. ✱ Decision: enforce with the self-hosted proxy, extend, or refund.
8. Weekly: pipeline review, the three marketing numbers, incidents.

### 2. Suppliers (published prices where they exist; quotes where not)

| Input | Options | Price | Lead time |
| --- | --- | --- | --- |
| Incorporation (to invoice anyone) | Stripe Atlas, a lawyer | Plan §7; check Atlas's current fee | 1 to 2 weeks |
| Hosting for `/business` and the demo | Vercel Pro (plan §8: $20 a month), Turso | As listed in the plan | Same day |
| SOC 2 platform | Vanta, Drata (startup programmes per plan §8) | $7.5k to $15k a year (research.md) | 2 to 4 weeks to set up |
| SOC 2 auditor, pen test | Auditors listed by the platform; an independent pen tester | Audits $15k to $40k; quotes needed | Type I window 1 to 3 months |
| Insurance: tech E&O and cyber | A broker for tech companies | Plan budgets $25k a year; quote needed | 2 to 4 weeks |
| Fintech lawyer (vendor-path opinion, contracts, DPA) | Plan §11 week 2 | Plan budgets $40k for year 1 | Book now |
| Payments | Stripe invoicing (card 2.9% + $0.30 per research.md), ACH | As listed | Same day |

No supplier's price above differs from `numbers.json`, so the CFO's numbers stand.

### 3. People

| Role | When | Hours | Pay assumption |
| --- | --- | --- | --- |
| Founder | Now | Full time | Plan §8 (below market) |
| Fractional CCO | Before the first pilot review | About a day a week | $4,000 a month (plan §8) |
| Founding engineer | **When the first paid pilot converts**, not month 3 | Full time | $140k loaded (plan §8) |
| Solutions / BD lead | When three pilots run at once | Full time | $72k for 7 months (plan §8) |

Payroll costs beyond wages vary by state; flag them for the accountant. Changing the hiring trigger from the calendar
to signed customers is the CFO's first margin lever (break-even 38 → 21 customers).

### 4. Routines

**Starting a pilot (first day).** 1) Countersigned pilot letter and invoice paid. 2) Policy workshop (45 minutes), write
the policy file. 3) Ask for a 7-day log sample, no customer names. 4) Run the replay; check the report totals against
the log line count. 5) Send the report and book the review within 3 business days.

**Running a replay.** `npx tsx scripts/gate-shadow.ts gate-proxy.json calls.jsonl --out shadow/` → read `report.md`;
any "unreadable" call is listed, never guessed. Keep the decisions file; it is the evidence.

**A complaint or incident.** Acknowledge within one business day; say what happened, what we changed and what the
firm should do; log it; tell the CCO. If it touches enforcement, the firm's kill switch is the first step.

**Closing a pilot.** Compliance review result in writing; refund within 5 business days if it failed; otherwise the
Growth order form with the 24-month price.

**Weekly.** Monday: pipeline (conversations, replays, pilots). Friday: numbers against the marketing thresholds.

### 5. Tools (the smallest stack)

Payments and invoices: Stripe. CRM: a spreadsheet until 20 firms, then a free CRM tier. Docs and email: Google
Workspace. Code and issues: GitHub (already). Bookkeeping: an accountant's choice. Check each one's current price
before signing; none was looked up from this session.

### 6. Licences, registrations, insurance (US, to confirm)

- Delaware C-corp, EIN, foreign qualification where the founder works ([Delaware Division of Corporations](https://corp.delaware.gov/)).
- **The vendor path:** a written legal opinion that Gate is software sold to regulated firms, not itself a broker-dealer
  or adviser (plan §7, §11). Before the first paid pilot.
- Sales tax on SaaS: varies by state; ask the accountant.
- Data: a DPA template; minimal personal data in logs (ask for none).
- Insurance: tech E&O and cyber before the first enforcing customer (plan §7).
- SOC 2: Type I report as soon as possible; say "planned, not started" until it is.

### 7. Risk register

| # | Risk | Likely | Bad | Plan |
| --- | --- | --- | --- | --- |
| 1 | No firm sends a log | Medium | High | Offer to run the replay on their side; sample log template |
| 2 | Vendor review stops the pilot (no SOC 2) | High | High | Out-of-band replay needs no access; security packet; Type I next |
| 3 | A firm's log contains customer personal data | Medium | High | Ask for none; reject and delete; DPA |
| 4 | Replay misreads a call | Medium | Medium | Unreadable calls are listed, never guessed; tests on real formats |
| 5 | "We'll build it" | High | Medium | Sell the evidence and the mapping, not the rules engine |
| 6 | No regulator asks in 2027 | Medium | High | Sell to early adopters; track FINRA and SAFR; content |
| 7 | AINRA seen as a conflict | Medium | Medium | API keys first; AINRA optional; separate governance (plan §7) |
| 8 | Founder bandwidth | High | High | Hire on signed customers; CCO day a week; Claude on engineering |
| 9 | A pilot fails the compliance review | Medium | Low | Refund ($1,500); learn what was missing |
| 10 | Name association with the failed "Liquid" exchange | Low | Medium | Lead with "Gate, by MyLiquid"; trademark check |

## Launch plan

Today is Thursday 12 November 2026. Launch day is **Monday 7 December 2026**: the Shadow Pilot opens to five design
partners. Owners: **F** = founder, **C** = Claude in the repo, **CCO** = fractional compliance officer.

### 1. The test before the money

| | |
| --- | --- |
| The test | Three firms pay $1,500 for the 60-day Shadow Pilot at the planned price |
| Success line, written now | **3 paid pilots signed by Monday 18 January 2027**, from 40 named firms contacted |
| What the panel predicts | 10% of decision-makers would pay (v2 re-test, 20 buyers), 4% for a free trial (v1, 100): an upper bound, because simulated buyers lean agreeable |
| What the money waits for | The engineer and BD hires (`ops.md` §3), the SOC 2 audits ($60k), the pre-seed |
| If real buyers fall short | Fewer than 3 by 18 January: back to `/founder-offer` (what blocked: trust, timing or need?) before any hire; fewer than 1: the board's pivot gate (plan §6, Arena-first or consumer-first) |

### 2. The countdown

**Week of 16 Nov**
- F: incorporate (Stripe Atlas or lawyer) and open the bank account. **Critical path:** no invoice without it. Due 27 Nov.
- F: book the fintech lawyer for the vendor-path opinion. **Critical path:** before the first paid pilot. Due 20 Nov.
- C: shadow replay tool, tests and quick-start (`scripts/gate-shadow.ts`, `docs/GATE.md`). Due 13 Nov.
- F: name the 40 firms and their compliance and product owners. Due 23 Nov.

**Week of 23 Nov**
- F + C: vendor security packet (architecture, data flows, threat model, SOC 2 timeline). Due 2 Dec.
- C: the FINRA / SAFR control mapping for Gate, from the app's evidence report. Due 2 Dec.
- F: agent-readiness checklist (one page). Due 24 Nov.
- F: start the CCO search; one day a week from launch. Due 4 Dec.
- Marketing calendar starts 23 Nov (`marketing.md` §3).

**Week of 30 Nov**
- F: approve the pilot terms (price, refund, 24-month lock) and the pilot letter with the lawyer. **Critical path.** Due 3 Dec.
- C: `/business` leads with the shadow replay and the programme, once F approves the terms. Due 4 Dec.
- F: friends-and-family run: one friendly firm or adviser runs a replay on a sample log, without the founder in the
  room (the board's Product condition). Due 4 Dec.
- C: publish latency numbers for the proxy (offer item L). Due 4 Dec.

**Critical path:** incorporation → pilot letter approved → first invoice. Everything else can slip a week without
moving the date.

### 3. Launch day, Monday 7 December (US Eastern)

| Time | Who | What |
| --- | --- | --- |
| 08:30 | C | Check `/business`, the replay quick-start and the demo; site gate off for `/business` only if F has made the site public |
| 09:00 | F | LinkedIn post: the programme, five slots (hooks 6, 10) |
| 09:30 | F | Personal email to the 15 warmest contacts |
| 11:00 | F | Calls booked from last week |
| 13:00 | F | Second email batch (hook 2) |
| 15:00 | F | Answer every reply the same day |
| 17:00 | F | Log the day: conversations, replays offered, pilots proposed |
| If something breaks | F | Replay fails on a firm's log: say so the same day, fix in the repo, rerun; the risk register's plan (`ops.md` §7) |

### 4. The first 30 days

| Week | Number | Target | Change something if |
| --- | --- | --- | --- |
| Each week | Conversations with a budget owner | 5 | Under 2 |
| By 18 Dec | Firms that ran a replay on their own log | 2 | 0 |
| By 6 Jan | Paid pilots signed | 1 | 0 |

**Reviews.** Day 7 (14 Dec): which hook got replies; who forwarded us to compliance. Day 14 (21 Dec): did any firm
send or run a log? If not, what stopped them (data, time, trust)? Day 30 (6 Jan): pilots against the success line;
decide on the engineer hire only if a pilot has converted or is about to.

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
