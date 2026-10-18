# 2. User research and validation

Each assumption from step 1 becomes a hypothesis with a measure, a method and a bar set in advance. If the bar
isn't met, we change course rather than move the bar.

## Hypotheses and bars

| # | Hypothesis | Measure | Method | Bar to pass | If it fails |
|---|---|---|---|---|---|
| H1 | Investors want an agent to **act** within limits | Share of early-access answers picking an action (invest, rebalance, trade, pay) over "only advise" | Waitlist on the front page | ≥ 60% of the first 150 investor answers | Reposition as an AI adviser with one-tap execution; test again |
| H2 | Leading with safety converts better than leading with the pet | Guest starts per front-page visitor, by variant | `landing_headline` A/B test | Safety variant +20% at 95% confidence | Keep the pet headline; safety goes lower on the page |
| H3 | People who try it do something real in their first visit | Activation: a trade, an agent decision, a hired trader or a connected agent | Funnel on `/admin` | ≥ 40% of people who try it | Cut onboarding steps; make the first proposal arrive in the first minute |
| H4 | They come back on their own | Day-7 retention of accounts | Retention on `/admin` | ≥ 20% (and day-30 ≥ 10%) | Investigate why with exit interviews before adding features |
| H5 | It's a must-have for a core group | Share "very disappointed" in the Sean Ellis survey | PMF survey on Home after a second visit | ≥ 40% of ≥ 40 answers | Find the "very disappointed" group's common job; narrow to them |
| H6 | Interviewees describe the problem unprompted, with a workaround | Count of the 15 investor interviews | Problem interviews (guide below) | ≥ 8 of 15 | The problem isn't sharp enough for segment A; try segment B |
| D1 | Firms have the gap now, with an owner and a budget | Count of the 20 business interviews; design-partner requests | Interviews; form on `/business` | ≥ 10 confirm the pain and a budget owner; ≥ 2 LOIs | Pivot the wedge to Arena-first or consumer-first (plan §6) |

## Instruments built into MyLiquid

| Instrument | Where | What it asks | Stored as |
|---|---|---|---|
| Early-access list | Front page, `#early-access` | Who you are; what you'd let an agent do; what you use today; optional email with consent | `research_responses` kind `waitlist`, event `waitlist_joined` |
| Product-market-fit survey | Home, once someone opens the app on a second day | Sean Ellis question; main benefit; who else it'd help; what to improve | kind `pmf`, event `pmf_answered` |
| Design-partner request | `/business#design-partners` | Company, role, work email, how agents reach accounts today, timeline | kind `design_partner` |
| AINRA interest | `/ainra` | Role (agent builder, platform, registrar…), what you need from agent identity, optional email | kind `ainra_interest` |
| Headline experiment | Front page hero | Pet-first vs safety-first headline, split by visitor | event `landing_viewed` with the variant |

Everything shows on the founder dashboard (`/admin`) and exports as CSV.

## Interviews

### Who and how many

- **15 investors from segment A.** Screener: invests at least monthly in their own brokerage account; has asked an
  AI chatbot about money in the last month; not working in finance or for a competitor. Mix of ages and amounts.
- **20 people at brokers and fintechs (segment D).** Head of product, CTO or compliance at firms that opened
  agent or MCP access in 2026, and the platform vendors behind them (plan §5 lists where to find them).
- **Recruit from:** the early-access list (answers with email and consent), investing and AI-agent communities,
  LinkedIn for firms, warm introductions. Offer a $25 gift card to investors; offer firms the design-partner
  programme.

### Investor interview guide (30 minutes, past behaviour, no pitching)

Ask about what people did, not what they would do. Don't show MyLiquid until the last five minutes.

1. Walk me through the last time you made an investing decision. What did you do, step by step?
2. Where did AI come into that, if at all? What did you ask, and what did you do with the answer?
3. What part of managing your money do you put off or dislike most? What did that cost you last time?
4. Have you ever let anything (a robo-adviser, an auto-invest rule, a person) act for you? What made you
   comfortable, or not? What would make you stop?
5. If something acted on your money and got it wrong, who would you hold responsible? What would you want to see?
6. What do you use today to stay on top of it? What do you pay for it?
7. *(Last five minutes.)* Show the demo: set a guardrail, approve a proposal. "What would you need to see before
   this touched real money?"

Listen for: a recent, specific workaround (copy-pasting from a chatbot into a broker app); a named fear (an agent
overspending, selling at the wrong time); money or time already spent on the problem.

### Business interview guide

Use the questions in [`../startup/plan.md`](../startup/plan.md) §5, and listen for a named owner, a regulator or
auditor asking, an incident, and a budget line.

### After each interview

Fill one row within the hour, then tally against the bars above every Friday.

| Date | Who (segment) | Recent workaround, in their words | Biggest fear | Would let an agent… | Pain 1–5 | Paying today? | Quote |
|---|---|---|---|---|---|---|---|

## Ethics

Tell interviewees what the notes are for, ask before recording, store notes without surnames, and delete
recordings after synthesis. In-product research follows `/privacy`: no third-party trackers, no IP addresses,
emails only with consent, Global Privacy Control and Do Not Track honoured.
