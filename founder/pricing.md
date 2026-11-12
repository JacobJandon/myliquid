# Pricing: MyLiquid

Three inputs: what 100 simulated buyers said (`pricing-curve.md`, `pricing-curve-app.md`), what competitors charge
(`competitors.md`), and what the business needs (`cfo.md`, run at each candidate price). Simulated price answers pick
what to test; they prove nothing.

## Gate

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

## The app (MyLiquid Plus)

| | Price a month |
| --- | ---: |
| PMC · OPP · IPP · PME | $2.04 · $3.02 · $5.04 · $11.97 |
| Panel medians: too cheap · bargain · getting expensive · too expensive | $1 · $3 · $8 · $15 |

0 of 100 investors would join the waitlist for a paid real-money plan at any price; price was the reason for 20 of
them, trust for 60. Competitors give agents away inside the broker (Robinhood, Public) or charge $40 a month (Composer);
robo-advisers charge 0.25% a year. **Recommendation: no consumer price.** The app stays free on demo money, as the board
also recommended. If a consumer price is ever tested, test $3 and $5 a month, and only once a licensed broker is named.

No "was $X" anchors, no below-cost pricing anywhere.
