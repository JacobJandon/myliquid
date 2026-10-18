# Discovery: from problem to product-market fit

How MyLiquid finds out whether it is worth building, and what to build next, instead of guessing. Five steps,
each with what is done in this repository and what only the founder can do.

| Step | Document | Built in the product | Needs you |
|---|---|---|---|
| 1. Problem and audience | [`1-problem-and-audience.md`](1-problem-and-audience.md) | The problem statements, the segments, the beachhead and the riskiest assumptions | Agree or change the beachhead |
| 2. Research and validation | [`2-research-and-validation.md`](2-research-and-validation.md) | Waitlist with segment questions (front page), PMF survey (Home), design-partner form (`/business`), AINRA interest (`/ainra`), headline A/B test | Run 15 investor and 20 business interviews with the guides; share the link |
| 3. Minimum viable product | [`3-mvp.md`](3-mvp.md) | The core loop, the activation definition, what's core vs experimental | Turn off Vercel Authentication so people can use it |
| 4. Measure and iterate | [`4-measure-and-iterate.md`](4-measure-and-iterate.md) | First-party analytics, the founder dashboard (`/admin`), experiments with significance tests, decision rules | Set `MYLIQUID_ADMIN_TOKEN`; a weekly 30-minute review |
| 5. AINRA in MyLiquid | [`5-ainra.md`](5-ainra.md) | The same four steps for agent identity: lab, tiered autonomy, interest form, metrics | Talk to agent builders and registrars |

**What this is not.** No user has been interviewed and no real usage has been measured yet: the live site is
still behind Vercel's login. Every threshold below is a bar set *before* looking at data, so the data can prove
us wrong. Market facts come from [`../startup/research.md`](../startup/research.md) and need checking before use
in public. The business plan they serve is [`../startup/plan.md`](../startup/plan.md).
