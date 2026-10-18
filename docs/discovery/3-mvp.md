# 3. The minimum viable product

The MVP is the smallest thing that tests H1–H5. MyLiquid already does more than that, so the job here is to
say what must work perfectly, what supports it, and what is an experiment we may cut.

## The core loop

1. **Set the rules.** Risk profile, limits, what agents may do alone (Guardrails).
2. **An agent proposes.** A rebalance, a recurring investment, a trade from a hosted or outside agent.
3. **You decide.** Approve or reject, with the reason and the checks it passed (Home → approval inbox).
4. **You see what happened.** The portfolio on real index and bitcoin prices, every decision in Activity, and
   one switch that stops everything.

If a visitor goes round this loop once, they have tested A1 and A2 for us. Everything that shortens the way to
step 3 is MVP work.

## Activation

**Activated** = in the first visit, the person places a trade, decides on an agent's proposal, hires a hosted AI
trader or connects an outside agent (`ACTIVATION_EVENTS` in `src/lib/domain/analytics.ts`). The guest demo starts
with a pending proposal so this can happen within a minute.

## Scope

| Tier | Features | Rule |
|---|---|---|
| **Core** (must be flawless) | Guest demo, guardrails, proposals and approvals, kill switch, portfolio on real prices, Activity log, sign-up, phone layout | Bugs here come before anything else |
| **Supporting** | Hosted AI traders, outside agents with AINRA passports, autopilot rules, recurring investments, limit orders, statements | Keep; measure use through events |
| **Experimental** | The Tamagotchi pet, Agent Pay (card, terminal, x402 data), private-market products, the Talk copilot | Keep while measured; cut or hide if they don't lift activation, retention or PMF answers |
| **Not in the MVP** | Real money, KYC, an App Store app, a firm console for Gate | After the step-2 bars are met (plan §6) |

The business MVP for segment D is already live: Gate's decision API, the `/business` playground and the
design-partner form. Its bar is the interviews, not traffic.

## Launch checklist

- [ ] Turn off Vercel Authentication (Vercel → Settings → Deployment Protection) so anyone can open the site.
- [ ] Set `MYLIQUID_ADMIN_TOKEN` (16+ random characters) in Vercel to open `/admin`.
- [ ] Optional: remove `MYLIQUID_SITE_PASSWORD` for a public launch, or keep it and share the password with testers.
- [ ] Share the link where segment A gathers; book the first five interviews from the early-access list.
- [ ] First weekly review one week after launch (step 4).
