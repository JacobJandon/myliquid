# Operations: MyLiquid Gate, the first 90 days

What has to happen for the Shadow Pilot to run without the founder in the room (the board's Product condition), and
what it costs. Rules differ by place and change; the user confirms each licence with the authority or a professional.
Not legal advice.

## 1. The cycle (✱ = the customer sees it)

1. ✱ Intake call: who owns agent risk, which MCP server or API, a sample of agent-call logs (JSON lines).
2. ✱ Data terms signed: the log stays on the firm's side when they run the replay themselves; if they send it, a DPA.
3. Write the firm's policy file (caps, approval line, identity tiers) with them: `scripts/gate-proxy.example.json`.
4. ✱ Run the shadow replay (`scripts/gate-shadow.ts`) on the log: decisions log plus the shadow report.
5. ✱ Review call: what Gate would have allowed, sent to a person, or refused, and why; the exam-pack mapping.
6. ✱ Compliance review of the exam pack (the refund condition).
7. ✱ Decision: enforce with the self-hosted proxy, extend, or refund.
8. Weekly: pipeline review, the three marketing numbers, incidents.

## 2. Suppliers (published prices where they exist; quotes where not)

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

## 3. People

| Role | When | Hours | Pay assumption |
| --- | --- | --- | --- |
| Founder | Now | Full time | Plan §8 (below market) |
| Fractional CCO | Before the first pilot review | About a day a week | $4,000 a month (plan §8) |
| Founding engineer | **When the first paid pilot converts**, not month 3 | Full time | $140k loaded (plan §8) |
| Solutions / BD lead | When three pilots run at once | Full time | $72k for 7 months (plan §8) |

Payroll costs beyond wages vary by state; flag them for the accountant. Changing the hiring trigger from the calendar
to signed customers is the CFO's first margin lever (break-even 38 → 21 customers).

## 4. Routines

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

## 5. Tools (the smallest stack)

Payments and invoices: Stripe. CRM: a spreadsheet until 20 firms, then a free CRM tier. Docs and email: Google
Workspace. Code and issues: GitHub (already). Bookkeeping: an accountant's choice. Check each one's current price
before signing; none was looked up from this session.

## 6. Licences, registrations, insurance (US, to confirm)

- Delaware C-corp, EIN, foreign qualification where the founder works ([Delaware Division of Corporations](https://corp.delaware.gov/)).
- **The vendor path:** a written legal opinion that Gate is software sold to regulated firms, not itself a broker-dealer
  or adviser (plan §7, §11). Before the first paid pilot.
- Sales tax on SaaS: varies by state; ask the accountant.
- Data: a DPA template; minimal personal data in logs (ask for none).
- Insurance: tech E&O and cyber before the first enforcing customer (plan §7).
- SOC 2: Type I report as soon as possible; say "planned, not started" until it is.

## 7. Risk register

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
