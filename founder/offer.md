# Offer: the MyLiquid Gate Shadow Pilot

Method: the Offers lens (`board/` and the founder-board lenses file), applied to what 100 simulated buyers said
(`panel/results.md`) and what competitors' customers complain about (`competitors.md`). Costs from `cfo.md`.

## 1. The problems, in the buyer's words (from the panel and the competitor map)

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

## 2. Solutions, scored (value to buyer 1-5, cost to deliver 1-5, 1 = cheap)

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

## 3. The stack

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

## 4. Value equation (1-10, before → after)

| Element | v1 (free six-month design partner) | v2 (Shadow Pilot) | What moved it |
| --- | ---: | ---: | --- |
| Dream outcome | 6 | 7 | The exam pack names the outcome: an answer for the examiner |
| Perceived likelihood | 2 | 4 | Refund tied to their own compliance review; security packet; still no SOC 2 or reference |
| Time to result | 4 | 7 | A report from replayed traffic in days, not a six-month integration |
| Effort and sacrifice | 3 | 6 | Nothing inline, nothing leaves the network, API keys only, no LOI before results |

## 5. The re-test (same seed, 20 buyers, `panel-offer/`)

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
