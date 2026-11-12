# Buyer panel: MyLiquid Gate (runtime controls for AI agents at brokers, crypto venues and neobanks)

**4 buy · 96 pass** (4% buy) out of 100 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

## By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Crypto venue | 25 | 8% |
| Mid-size retail broker | 35 | 6% |
| Agentic trading startup | 8 | 0% |
| Trading-platform vendor | 12 | 0% |
| Neobank or fintech with investing | 20 | 0% |

## By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Early adopter | 12 | 33% |
| Compliance-led | 18 | 0% |
| Builds in-house by default | 18 | 0% |
| Waits for regulation | 14 | 0% |
| Vendor-risk cautious | 12 | 0% |
| Fast follower | 14 | 0% |
| Budget-squeezed | 12 | 0% |

## By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $304,000 and up | 34 | 6% |
| under $219,000 | 33 | 3% |
| $219,000 to $304,000 | 33 | 3% |

## Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 47 | "I won't put an inline proxy from a startup with no customers and no SOC 2 report in front of our order path, even for free. If it goes down or gets breached, our trades stop and I'm the one explaining it to FINRA." (P001) · "I won't put a startup without a SOC 2 report in our order path, and this one has no customers and only a planned audit. Nothing in writing from FINRA or the SEC makes me need agent-level pre-trade controls yet, so it's not going into next year's budget." (P003) |
| timing | 21 | "Our agent volume through the MCP server is tiny today, and no regulator has written a rule or brought an enforcement action that says I need a separate agent-identity and approval layer. I'm not putting a proxy in front of customer trades, or signing a letter of intent with a price in it, on the strength of speeches and reports." (P004) · "I like being first, but our agent volume is tiny today and my engineers already rate-limit every API key, so there's nothing here I'd pay for this month. At our volume we'd sit inside the free tier anyway, and I won't sign an LOI naming a price for a problem we don't have at scale yet." (P005) |
| need | 20 | "My team already rate-limits every key and could build caps, an approval queue and a kill switch for agent accounts inside a quarter, and no regulator is asking me for this yet. I don't buy what I can build, especially not something that sits in my order path." (P011) · "Our agent volume is tiny today, and a proxy that checks caps, routes big orders to a human and has a kill switch is something my team can build in a quarter on top of controls we already run. I'll answer the examiner's AI question with our own policy and logs, not a vendor with no customers sitting in the trade path." (P013) |
| habit | 7 | "Identity check, per-customer caps, a human-approval queue and a kill switch in front of our own order path is a quarter of work for my team, and with a competitor already live we'd rather own that layer than rent it. I'd take the demo call to steal the checklist, not to sign." (P002) · "A policy check in front of our MCP server, an approval queue, a kill switch and a hash-chained log are things my team can build in a quarter, and we'd rather own anything that sits in the trade path. I'm not putting a startup with no customers and no SOC 2 in front of order execution, and I'm not signing an LOI with a price on it just to get six free months." (P009) |
| price | 1 | "I'm building next year's budget right now and this isn't in it. A metered tool from a startup with no customers loses to a headcount line every time. At most I'd let my engineers poke at the free Developer tier. That isn't buying." (P090) |

## Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 3 | "We opened our MCP server to customers' agents this year, and I have nothing between an agent's call and an executed trade except our own caps, so I'd take the free design-partner slot and run it in shadow mode on a slice of traffic. That's a pilot, not a budget line yet. Whether we pay comes down to what the six months show." (P012) · "We're letting customer agents onto the venue and right now our controls are rate limits plus hope, so I'd take the free design-partner slot and run it in shadow mode next to the order path. I'd sign the LOI only if the price has a ceiling. Paying the Growth tier comes after it proves itself, and it goes into next year's budget as a line item conditional on the pilot." (P062) |
| timing | 1 | "A competitor announced agent trading last month, and a free six-month pilot with no code change gets us a governed answer in weeks instead of the quarters my own team would need. I'd sign up as a design partner in a sandbox, but that's a pilot, not a production commitment." (P076) |

## What would flip a no

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
