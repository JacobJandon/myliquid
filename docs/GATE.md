# MyLiquid Gate

Gate is the runtime check a broker or fintech puts between AI agents and its customers' money. For every trade
or payment an agent wants to make, it checks who the agent is, what the firm allows, and decides:

- `allow`: the agent may go ahead on its own;
- `review`: a person decides;
- `block`: it stops.

It's the B2B product in [`startup/plan.md`](startup/plan.md) (P1). Try it on the `/business` page.

## The rules

Checks run in this order, and the worst result wins (`block` over `review` over `pass`):

| Check | `block` when | `review` when |
|---|---|---|
| Kill switch | the policy's kill switch is on | |
| Amount | not a whole number of cents between 1 and $10M | |
| Instrument (trades) | not on `allowedInstruments` (when set) | |
| Merchant category (payments) | in `blockedCategories` | |
| Agent identity | | no AINRA passport, or one that doesn't verify (revoked, stale, unreadable…) |
| Identity tier | | tier below L2, or above its ceiling (L2 $2,500 · L3 $10,000 · L4 $25,000) |
| Declared capability | | the passport doesn't declare `myliquid:trade` / `myliquid:pay` (or `myliquid:*`) |
| Autonomy | | the policy is propose-only |
| Per-action limit | | above `perActionLimitCents` |
| Daily limit | | today's usage plus this action passes `dailyLimitCents` |
| Rate | | `actionsLastHour` reached `maxActionsPerHour` |

Identity comes only from a passport Gate verifies itself (`lib/ainra`, fail closed). Anything the caller says
about the agent is ignored.

## The API

`POST /api/gate/v1/decide`, JSON in and out. Amounts are integer cents.

```json
{
  "action": { "kind": "trade", "amountCents": 150000, "side": "buy", "instrument": "MLUS" },
  "agent": { "id": "northwind-momentum", "passport": "<the agent's AINRA presentation bundle>" },
  "policy": {
    "mode": "auto",
    "perActionLimitCents": 200000,
    "dailyLimitCents": 500000,
    "maxActionsPerHour": 30,
    "allowedInstruments": ["MLUS", "MLWX"],
    "blockedCategories": ["gambling"],
    "killSwitch": false
  },
  "usage": { "usedTodayCents": 0, "actionsLastHour": 2 }
}
```

How to fill in the request:

- **Payments:** use `"kind": "payment"` with `merchant` and `category` instead of `side` and `instrument`.
- **The passport:** pass it as an object, as JSON text, or as base64url (the `x-ainra-passport` header form).
- **Testbed mode:** you can send `"sample": "momentum-trader"` (or `treasury-agent`, `research-analyst`,
  `yield-hunter` with `"revoked": true`) instead of a passport.

The answer:

```json
{
  "decision": "allow",
  "summary": "Allowed: northwind-momentum may buy MLUS for $1,500 on its own.",
  "checks": [{ "id": "kill_switch", "label": "Kill switch", "status": "pass", "detail": "Off." }],
  "evidence": { "decidedAt": "…", "requestHash": "<sha256>", "decisionHash": "<sha256>" },
  "identity": { "verified": true, "number": "did:ainra:…", "tier": "L2", "capabilities": ["myliquid:trade"] }
}
```

`checks` lists every check, not only the one shown here.

Gate stores nothing and moves no money. Keep the decision with your own records:

- `requestHash` changes if anything in the request changes;
- `decisionHash` covers the request, the decision, every check and the time;
- `verifyEvidence` in `src/lib/gate/engine.ts` recomputes both.

## Code

| Piece | File |
|---|---|
| Decision engine (pure) | `src/lib/gate/engine.ts` |
| Identity from a passport | `src/lib/gate/identity.ts` |
| API route | `src/app/api/gate/v1/decide/route.ts` |
| Playground and business page | `src/components/gate/GatePlayground.tsx`, `src/app/business/page.tsx` |
| Tests | `src/lib/gate/__tests__/gate.test.ts` |

## Next

From the plan:

- tenancy (firm → customer → agent), with firm API keys and stored usage;
- signed webhooks for reviews;
- a hash-chained decision log with SAFR/FINRA-mapped export;
- the MCP guardrail proxy in front of a broker's MCP server;
- more identity standards (Visa Trusted Agent Protocol, Skyfire).
