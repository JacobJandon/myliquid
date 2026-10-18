# 4. Measure and iterate

Build, measure, learn, once a week. The numbers come from MyLiquid's own first-party analytics and research
answers; the founder dashboard at `/admin` shows them; the rules below say what each result makes us do.

## What is recorded, and what isn't

- **Events** (`events` table): a short, fixed list in `EVENTS` (`src/lib/domain/analytics.ts`). Server-side
  where the thing happens (a demo started, an order placed, a proposal decided, an agent connected), plus a page
  view from the front page. Each carries a random first-party device id (`ml_vid` cookie) and, for accounts, the
  account id.
- **Research answers** (`research_responses`): waitlist, PMF survey, design-partner and AINRA forms.
- **Never:** IP addresses, third-party trackers, anything for bots or for visitors who send Global Privacy
  Control or Do Not Track. Deleted accounts leave only anonymous counts; raw events go after about 13 months
  (`/privacy`).

| Event | Means |
|---|---|
| `landing_viewed` | Front page seen (with the experiment variant) |
| `guest_started`, `signed_up` | Tried the demo; saved an account |
| `app_opened` | Account active that day (once a day) |
| `trade_placed`, `proposal_decided`, `trader_hired`, `agent_connected` | Activation actions |
| `pmf_answered`, `waitlist_joined`, `design_partner_requested`, `ainra_interest` | Research answers |
| `ainra_inspected`, `gate_decided` | AINRA lab checks; Gate API decisions |

## The dashboard (`/admin`)

Set `MYLIQUID_ADMIN_TOKEN` (16+ random characters) in Vercel, open `/admin` and enter it. It shows:

1. **Funnel:** saw the front page → tried it → activated → saved an account, with step conversion.
2. **Retention:** day 1, 7 and 30 (active again N to N+6 days after the first day).
3. **Product-market fit:** share "very disappointed" against the 40% bar, with what people value and want fixed.
4. **Experiments:** visitors and conversions per variant, lift, p-value, and the sample size a 20% lift needs.
5. **Research:** answers by kind, early access by segment, leads (CSV export).
6. **AINRA and Gate:** lab checks by tamper and verdict, Gate decisions by outcome and identity, agents connected
   by tier.

## Decision rules

Decide on the numbers below, not on a feeling, and write each decision down with its date.

| When | Then |
|---|---|
| Front page → tried it < 10% after 1,000 visitors | Rewrite the hero; test a new headline against the winner |
| Tried → activated < 40% | Shorten the path: fewer screens before the first proposal; watch five people try it |
| Day-7 retention < 20% after 100 accounts | Stop adding features; interview five people who didn't come back |
| PMF < 40% "very disappointed" after 40 answers | Read the "very disappointed" answers; narrow to the job they share; re-survey in 6 weeks |
| PMF ≥ 40% and day-30 retention ≥ 10% | Move to the real-money path (plan §6, consumer decision) and a pricing test |
| An experiment hits p < 0.05 with the planned sample | Ship the winner, remove the loser from the code, log it below |
| An experiment hasn't reached its sample in 4 weeks | Stop it; the difference is too small to matter at our traffic |
| Under 3 design-partner requests and under 10 confirming interviews by week 4 | Pivot the business wedge (plan §6) |

## Weekly review (30 minutes, every Monday)

1. Funnel and retention against last week. One sentence: what changed and why we think so.
2. New research answers: read every PMF "improve" and early-access "what do you use today".
3. Experiments: stop, keep running, or ship.
4. Pick the **one** change for this week that most affects the weakest number. Build it, ship it, measure it.

## Experiments

How to add one:

1. Add it to `EXPERIMENTS` in `src/lib/domain/analytics.ts`: a hypothesis with the result that would prove it
   wrong, the variants, and the goal event.
2. Render the variant from `assignVariant(visitorId, experiment)` and send it in the exposure event's props.
3. Before starting, note the sample size the dashboard says you need. Don't peek and stop early.

Backlog, highest expected learning first:

| Experiment | Hypothesis it tests | Goal |
|---|---|---|
| `landing_headline` (**running**): pet vs safety | A2, A4 | `guest_started` |
| Guardrails first vs proposal first in onboarding | A2, H3 | activation |
| Pet visible vs hidden on Home for new accounts | A4 | day-7 retention |
| "Agent asks first" vs "agent acts within limits" as the default | A1 | activation, PMF |
| Pricing fake door ("MyLiquid Plus, $X a month: join the list") | A5 | clicks per visitor |

## Log

| Date | Change or experiment | Result | Decision |
|---|---|---|---|
| 2026-10-18 | Analytics, research instruments, `landing_headline` and the opening Atlas proposal for guests | Waiting for traffic | Review one week after the site is public |
