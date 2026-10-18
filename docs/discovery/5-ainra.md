# 5. AINRA in MyLiquid: the same four steps

AINRA gives AI agents passports that anyone can verify. MyLiquid is a verifier: identity decides how far an
agent may act on an investor's account, and Gate sells the same check to brokers. This applies steps 1–4 to that.
How it works technically is on the public page `/ainra` and in [`../AINRA-LIVE.md`](../AINRA-LIVE.md).

## 1. Problem and audience

**The problem:** a platform that lets agents act on accounts can't tell which agent is acting, who is accountable
for it, or whether its maker still vouches for it. An agent can't prove the same thing from one platform to the
next. API keys say "someone with this key", not "this agent, run by this company, allowed to do this".

| Audience | Their problem | What AINRA in MyLiquid gives them |
|---|---|---|
| Investors (segment A) | "Which agent is in my account, and can I stop it?" | Every outside agent is named, tiered and revocable; unidentified agents only propose |
| Brokers and fintechs (segment D) | "Which agent placed this order, and who answers for it?" | Gate: decisions from a verified identity, never a claim, with evidence |
| Agent builders (segment C) | "How do I get trusted with more than read access?" | A passport unlocks autonomy by tier: L2 trades up to $2,500 an order on its own, L3 $10,000 |
| Registrars | "Who will accept the passports I issue?" | A working verifier and a reason for agents to get passports |

**Riskiest assumptions:**

| # | Assumption | Why it could be wrong |
|---|---|---|
| I1 | Platforms will require a verified identity, not just keys | Keys and rate limits may feel enough until an incident |
| I2 | Builders will get a passport to unlock autonomy | The effort may outweigh the benefit while few platforms ask |
| I3 | There will be registrars to issue passports | AINRA's production root is pre-genesis; today it's TEST-ROOT and self-run registrars |
| I4 | Presentations are practical to send on every session | A presentation is about 36 KB (post-quantum signatures), too large for most HTTP headers, so agents send it once to `/api/agent-identity` and act within a 5-minute window |
| I5 | One identity standard is acceptable to firms | Firms may want Visa, Mastercard or other KYA standards; AINRA must stay neutral and Gate must support others |

## 2. Research and validation

| # | Hypothesis | Measure (on `/admin`) | Bar | If it fails |
|---|---|---|---|---|
| I1 | Firms want identity in the decision | Business interviews mentioning identity unprompted; Gate decisions with verified agents | ≥ 6 of 20 interviews; verified share rising | Lead Gate with limits and evidence; identity becomes an add-on |
| I2 | Builders want passports | `ainra_interest` from agent builders; agents connected with a passport, by tier | 20 builder answers and 5 passport-connected agents in 8 weeks | Offer free testbed passports in one click from Traders (the Arena path) |
| I3 | A registrar is runnable | A live registrar issuing and revoking for hosted traders (`scripts/ainra-live.sh`) | Running on a host, used by hosted traders | Keep the testbed; support AINRA's genesis |
| — | People understand what identity does | Lab checks per visitor to `/ainra`; tampers tried | Most visitors try at least one tamper | Simplify the page: one passport, one attack, one result |

Interview agent builders with three questions: *How do platforms decide what your agent may do today? What
did it cost you to get more than read access somewhere? What would you need to show to be trusted with money?*

## 3. The MVP

Already live:

- **Verifier:** `checkPassport` (fail-closed, offline, hybrid Ed25519 + ML-DSA-65), the 5-minute presentation
  window and `identityGate` on MCP and x402.
- **Tiered autonomy:** what a verified agent may do alone, by tier and declared capabilities (`autonomyDecision`).
- **Live registrar integration:** hosted traders with real, revocable passports when a registrar is configured.
- **The lab** (`/ainra`): visitors try to fool the verifier and see why it refuses.
- **Gate:** identity from a verified passport only.

Not in the MVP: delegation-chain management in the UI, instance credentials, other KYA adapters (Visa TAP next,
plan §4), a hosted public registrar.

## 4. Measure and iterate

| Signal | Where it shows | What it means |
|---|---|---|
| `ainra_inspected` by tamper and verdict | AINRA and Gate card | Curiosity, and which attacks people care about |
| `agent_connected` by tier | AINRA and Gate card | Real adoption by agent builders |
| `gate_decided`, verified vs unverified | AINRA and Gate card | Whether callers bring identity at all |
| `ainra_interest` by role | Research answers and leads | Who wants AINRA, in their own words |

Decision rules:

- **Under 5 passport-connected agents after 8 weeks of a public site:** remove friction first (one-click testbed
  passports, a copy-paste enrollment snippet), then re-measure for 4 weeks.
- **Gate calls arrive mostly without identity:** keep identity optional in Gate's pitch and prioritise the Visa TAP
  adapter, so identity comes from what callers already have.
- **Interest is mostly from registrars and platforms, not builders:** AINRA's next step is governance and a public
  registrar, not more MyLiquid features.

Keep AINRA neutral (plan §7): MyLiquid is one verifier among many, and says so in every sales conversation.
