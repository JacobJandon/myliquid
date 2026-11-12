# CFO's note: MyLiquid Gate

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

# Unit economics: MyLiquid Gate (Growth plan)

Every number below comes from the input file. Nothing is looked up or guessed.

## One paying customer-month

| line | per paying customer-month |
| --- | ---: |
| Price | $1,500.00 |
| Card processing on a $1,500 invoice (2.9% + $0.30, research.md) [worst case; ACH is cheaper] | -$43.80 |
| Compute and database for 1M governed actions (estimate: plan says fractions of a cent per 1,000) | -$25.00 |
| Evidence storage and exports (estimate) | -$5.00 |
| **Contribution** (what each paying customer-month leaves to pay the fixed costs) | **$1,426.20** (95%) |

## The margin that matters

Fixed costs: $52,869 a month (Two founders, below-market ($180k/yr, plan §8) $15,000, Founding engineer, loaded ($140k over months 3-12, plan §8) $14,000, Solutions/BD lead ($72k over months 6-12, plan §8) $10,286, Fractional CCO (plan §8) $4,000, Infrastructure, market data, Claude API ($30k/yr, plan §8) $2,500, Insurance: E&O, cyber, D&O ($25k/yr, plan §8) $2,083, Go to market: events, hackathons, design, travel ($50k/yr, plan §8) $4,167, SOC 2 compliance platform (~$10k/yr, research.md range $7.5-15k) $833).

- **Break-even: 38 paying customer-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (13 a day): **-176%** of every sale, after every cost.

## Year 1, month by month

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

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | -176% | 38 | -$570,249 |
| Price -10% | -207% | 42 | -$576,999 |
| Volume -20% | -244% | 38 | -$583,085 |
| Unit costs +15% | -177% | 38 | -$570,747 |

## Red flags

- Year 1 loses money on operations (-$570,249).
- The startup spend is not earned back within year 1.
