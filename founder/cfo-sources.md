# Where the CFO's numbers come from

| Input | Value | Source |
| --- | --- | --- |
| Price | $1,500 a month | Growth plan, `docs/startup/plan.md` §3 |
| Card processing | $43.80 | Stripe's card rate 2.9% + $0.30, as recorded in `docs/startup/research.md` §5 (worst case; ACH or invoices cost less) |
| Compute and database | $25 | **Estimate.** The plan says a decision costs "fractions of a cent per thousand"; 1M actions at 2.5¢ per 1,000 |
| Evidence storage | $5 | **Estimate** |
| Salaries, CCO, infra, insurance, GTM | as listed | `docs/startup/plan.md` §8, yearly amounts spread over the months each applies |
| SOC 2 platform | $833 a month | `docs/startup/research.md` §5 range $7.5k to $15k a year; midpoint-ish $10k |
| Legal | $40,000 once | Plan §8 |
| SOC 2 audits and pen test | $60,000 once | Plan §8's $70k minus the platform above |
| Buffer ($55k in the plan) | left out | A contingency, not a cost |
| Ramp | 0,0,0,0,1,1,2,4,6,8,10,13 | Plan §6: first paying customer in months 3 to 6, about 13 customers by month 12 |

Simplifications, both conservative: the tool charges every fixed cost from month 1 (the engineer and BD lead start in
months 3 and 6), and it prices every customer at Growth (the plan's Enterprise deals are higher; see the $2,692
what-if).
