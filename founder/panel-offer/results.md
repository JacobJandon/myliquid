# Buyer panel: MyLiquid Gate (runtime controls for AI agents at brokers, crypto venues and neobanks)

**2 buy · 18 pass** (10% buy) out of 20 simulated buyers. Seed 7, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

## By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Trading-platform vendor | 2 | 50%  (thin) |
| Neobank or fintech with investing | 4 | 25%  (thin) |
| Crypto venue | 5 | 0%  (thin) |
| Agentic trading startup | 2 | 0%  (thin) |
| Mid-size retail broker | 7 | 0%  (thin) |

## By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Early adopter | 2 | 100%  (thin) |
| Compliance-led | 4 | 0%  (thin) |
| Vendor-risk cautious | 2 | 0%  (thin) |
| Waits for regulation | 3 | 0%  (thin) |
| Budget-squeezed | 2 | 0%  (thin) |
| Fast follower | 3 | 0%  (thin) |
| Builds in-house by default | 4 | 0%  (thin) |

## By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| under $232,000 | 6 | 33%  (thin) |
| $232,000 to $306,000 | 7 | 0%  (thin) |
| $306,000 and up | 7 | 0%  (thin) |

## Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 10 | "The exam question about AI is real and the exam pack is exactly what I'd want to hand an examiner, but shadow mode is still an inline proxy sitting in front of the MCP server our customers' agents trade through. A startup with no customers and a SOC 2 audit that hasn't even started won't get past our vendor risk review, and $1,500 or a refund doesn't change that." (P001) · "No SOC 2, no customers, no references: that doesn't get through our vendor review, and our committee won't put an unreviewed proxy inline in front of the order path, even in shadow mode. It's still another hop and a new point of failure, whatever it does or doesn't block." (P003) |
| timing | 3 | "No regulator requires this yet, and $18k a year is a real chunk of a hire for us. I can log agent calls and set caps in front of our MCP server with open-source tooling and our own engineers until FINRA actually asks for it." (P007) · "Nobody has written a rule or brought an enforcement case on AI agents trading customer accounts yet, so I'm not putting a new vendor in my order path for next year's budget on the back of FINRA reports and speeches. Shadow mode is a cheap way to look, but it still means a pre-SOC 2 startup with zero customers going through my vendor review." (P012) |
| habit | 3 | "A proxy that checks keys, enforces caps, routes big orders to a person and has a kill switch is a quarter's work for my team, and we'd own it instead of putting a startup's code in front of customer order flow. The price isn't the problem; we just build this kind of thing ourselves." (P016) · "A proxy that logs MCP calls, checks caps per key and has a kill switch is something my team can build in a quarter. We already rate-limit every key, so we'd extend what we have instead of putting a vendor in the order path." (P017) |
| need | 2 | "No regulator has written a rule or brought an enforcement case that says I need a separate gate in front of agent MCP calls. Until one does, caps, a kill switch and a decision log are things my team can build ourselves on the API keys we already issue. The price is fine, but I'm not putting a line in next year's budget for a vendor with no customers and no SOC 2 to fix a problem the rules don't make me fix yet." (P004) · "No regulator requires agent-specific controls yet, and neither Robinhood nor Coinbase has shown me they run something like this, so I'm not going to be the design partner. The $1,500 isn't the issue; pushing a startup with no customers and no SOC 2 through vendor risk to sit in front of our MCP server is weeks of work for something nobody is asking us for." (P018) |

## Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 2 | "We're opening accounts to agents and rate limits don't get me per-customer mandates, a person-in-the-loop over limits, or a kill switch, and they certainly don't get me something I can hand an examiner. $1,500, refundable, shadow-only, and I can run it on our own API keys without touching their passport registry. That's a cheap pilot and I like being first." (P002) · "We're opening accounts to agents and I need a control story before the regulators ask. A $1,500 shadow pilot that runs inside our network, blocks nothing and is refunded if compliance rejects the exam pack is an easy yes. The flat monthly price also fixes my usual worry about budgeting per-action fees while I'm setting next year's numbers." (P013) |

## What would flip a no

- A completed SOC 2 report, even Type I, or a way to run shadow mode out of band on a copy of the traffic so nothing sits in the live order path until it's audited.
- A finished SOC 2 report plus a reference from a regulated broker or venue running it in production. Failing that, a shadow mode that reads a mirrored copy of the traffic instead of sitting inline.
- A written FINRA rule, an exam finding or an enforcement action that specifically requires pre-trade controls and audit evidence for customer AI agents, plus a finished SOC 2 report from the vendor.
- An examiner or auditor asking us how we control customers' AI agents, plus at least a SOC 2 Type I report in hand. Then I'd run the shadow pilot with API keys only and leave the passport registry out.
- FINRA or an exam team asking us in writing how we supervise and stop AI agents trading in customer accounts, and us having no good answer.
- A regulator, or our exam team, formally asking how we control customer AI agents, with the Growth tier priced closer to $500 a month.
- Seeing Robinhood, Coinbase or a broker our size run it in production in front of their agent endpoints, with published latency numbers and a SOC 2 Type II report.
- A regulator or our auditor asking how we supervise and can halt customer AI agents, plus a completed SOC 2 Type I (or a deployment that runs on mirrored traffic only, off the order path), would get me to sign the refundable pilot.
- A broker or crypto venue we benchmark against running it in production, or a FINRA examiner accepting their exam pack at a firm our size, plus a SOC 2 Type II report.
- A finished SOC 2 report in hand, or a version that reads a mirrored copy of the traffic so it can never sit inline on orders during the pilot.
- FINRA issuing an actual rule or bringing an enforcement action over agent-initiated trading without supervisory controls, with a finished SOC 2 Type II behind the vendor.
- A written rule or a public enforcement action against a venue over an AI agent trading on a customer account. Then I'd want this in shadow mode the same week.

Buyers say they would buy **1.0 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.
