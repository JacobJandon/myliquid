# Launch: the Gate design-partner programme

Today is Thursday 12 November 2026. Launch day is **Monday 7 December 2026**: the Shadow Pilot opens to five design
partners. Owners: **F** = founder, **C** = Claude in the repo, **CCO** = fractional compliance officer.

## 1. The test before the money

| | |
| --- | --- |
| The test | Three firms pay $1,500 for the 60-day Shadow Pilot at the planned price |
| Success line, written now | **3 paid pilots signed by Monday 18 January 2027**, from 40 named firms contacted |
| What the panel predicts | 10% of decision-makers would pay (v2 re-test, 20 buyers), 4% for a free trial (v1, 100): an upper bound, because simulated buyers lean agreeable |
| What the money waits for | The engineer and BD hires (`ops.md` §3), the SOC 2 audits ($60k), the pre-seed |
| If real buyers fall short | Fewer than 3 by 18 January: back to `/founder-offer` (what blocked: trust, timing or need?) before any hire; fewer than 1: the board's pivot gate (plan §6, Arena-first or consumer-first) |

## 2. The countdown

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

## 3. Launch day, Monday 7 December (US Eastern)

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

## 4. The first 30 days

| Week | Number | Target | Change something if |
| --- | --- | --- | --- |
| Each week | Conversations with a budget owner | 5 | Under 2 |
| By 18 Dec | Firms that ran a replay on their own log | 2 | 0 |
| By 6 Jan | Paid pilots signed | 1 | 0 |

**Reviews.** Day 7 (14 Dec): which hook got replies; who forwarded us to compliance. Day 14 (21 Dec): did any firm
send or run a log? If not, what stopped them (data, time, trust)? Day 30 (6 Jan): pilots against the success line;
decide on the engineer hire only if a pilot has converted or is about to.
