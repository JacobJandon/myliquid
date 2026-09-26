# Platform review, what to shorten, and the AINRA connection (Sept 2026)

This note looks at MyLiquid as it stands, finds what can be cut or merged, sets out what to build next, and explains
how MyLiquid connects to **AINRA** (https://github.com/JacobJandon/ainra, live site ainra.vercel.app): what it is,
what MyLiquid does with it today, and how MyLiquid becomes a full AINRA user.

## 1. Where MyLiquid is

| Area | What exists |
|---|---|
| Investing | Five sleeves and 13 products with real liquidity terms. The liquidity ladder, market orders with live pre-trade checks, **limit orders**, **recurring investments**, autopilot rules and CSV statements. |
| Agents | A desk of five specialists (Atlas, Quant, Scout, Ledger, Sentinel), each investor's **Tamagotchi pet** (chat, briefings, habits, kill switch as sleep), and bring-your-own-agent over MCP with read, trade and pay keys. Claude or a deterministic offline mode. |
| Agent Pay | An owner-funded agent wallet, a tokenized agent card with a hard/soft policy, a public POS terminal, owner approvals and x402-style pay-per-call data. |
| Identity | Accounts, guest demos, sessions and API keys. **AINRA passports for connected agents** (new, section 4). |
| Size | About 19k lines of TypeScript: domain 2.9k, services 4.2k, agents 2.1k, API 1.2k (41 routes), pages 1.5k (14), components 5.8k. 83 tests in 1.7k lines. |

## 2. What we can shorten

Each finding records why it matters and whether this change already acts on it.

| # | Finding | Why it matters | Status |
|---|---|---|---|
| 1 | Two money formatters: the pet's `formatDollars` duplicated `formatUsd`. | The codebase rule is "format only at the edges (`lib/domain/money.ts`)". Two formatters drift. | **Done**: removed, the pet uses `formatUsd`. |
| 2 | The standing-orders UI had its own price formatter. | Same drift risk. | **Done**: uses `formatPrice`. |
| 3 | Nine sidebar items with long labels ("Connect an agent", "Agent desk") overflow the mobile tab row. | Navigation is the most-read UI. | **Done**: grouped into Money / Agents / Account with shorter labels (Desk, Connect). |
| 4 | Three automation features (rules, recurring investments, limit orders) could each have had their own page. | More pages, same idea. | **Done** earlier: one Autopilot page. |
| 5 | The pet is the agent id `copilot` in code, logs and the MCP registry, but is called by its pet name in the UI. | Two names for one thing confuse contributors. | Proposed: rename the id to `pet`. Stored audit events need a data migration. |
| 6 | The Agent desk page mostly shows the same run as the pet's "Run the desk" button, plus logs. | Most investors never need the per-agent view. | Proposed: make Desk an advanced view reached from Home, and drop it from the main nav. |
| 7 | The landing page has seven sections (556 lines). "The desk" and "shadow banking" both explain *why it's safe*. | Shorter pages convert better. | Proposed: merge them into one "Why it's safe" section, and add an "Agent identity (AINRA)" tile to the bento. |
| 8 | The Connect page stacks six blocks: key form, three setup snippets, keys, AINRA, tools by scope, activity. | Long page for a one-time task. | Proposed: collapse the snippets behind "Show setup" once a key exists. |
| 9 | `lib/agents/tools.ts` is 854 lines with 21 tools in one file. | Hard to review, and merge conflicts. | Proposed: split by area (portfolio, trading, pay, standing orders), keeping `TOOLS` as the index. |
| 10 | `lib/services/payments.ts` is 679 lines. | Wallet/card and terminal/x402 change for different reasons. | Proposed: split into `wallet.ts` and `terminals.ts`. |
| 11 | The offline copilot is a 546-line chain of regex intents. | Order-dependent bugs (one happened before: "bond" matched the wrong product). | Proposed: a table of `{ pattern, tool, render }` intents, tested as data. |
| 12 | Sign-up asks three risk questions before you see anything. | Friction before value. The guest demo already shows the value. | Proposed (product call): default to Balanced and ask the questions on first deposit. |

## 3. What to build next

**Code only (no partners needed)**

1. **AINRA passports for every pet (phase 2 of section 4).** It is the natural next step for Agent Pay.
2. **Signed presentations (RFC 9421).** When `@ainra/sdk` publishes request signing (AINRA D-062; present in its
   repository, not in npm 0.4.1), bind presentations to the request as well as the key.
3. **Realized P&L, cost basis per lot and a tax-lot report** on the statement.
4. **Notifications** (email or web push) for held payments, skipped recurring buys, fills and the call light.
5. **An installable PWA**, so the pet and the Agent Pay tap flow live on the phone's home screen.
6. The shortening items above (5–11).

**Needs partners or licences.** These are the steps that make it a real financial platform. Each is a regulated
activity or a contract:

- **Market data:** a licensed feed replaces the price simulation behind the same `prices` table.
- **Brokerage:** a broker-dealer API (paper trading first) behind `executeOrder`. Order placement already has a
  single choke point.
- **Bank links and money movement:** account linking for deposits and withdrawals. Withdrawals stay human-only.
- **KYC/KYB:** identity verification behind the existing `kyc_status`.
- **Card issuing:** a card program with network agentic tokens (Mastercard Agent Pay, Visa Intelligent Commerce)
  behind the agent card. `evaluatePayment` already is the authorization policy.
- **Registration:** investment advice and brokerage need the right licences (for example a registered adviser and
  a broker-dealer partner), and holding funds needs money-transmission cover or a licensed partner.

## 4. MyLiquid and AINRA

### What AINRA is

AINRA calls itself *the neutral root of AI-agent identity*. A registrar issues an agent a **passport**: a signed,
transparency-logged credential with the agent's name and permanent **AINRA Number** (`did:ainra:reg:operator:lineage`),
its **tier** (L0 declared … L4 regulated), its **capabilities**, and a revocation status. Anyone verifies a passport
offline, in a few lines, with the published `@ainra/sdk`: hybrid Ed25519 + ML-DSA-65 signatures, an RFC 6962 log,
and a status list that must be fresh (5 minutes by default) or the verdict **fails closed**. It answers three
questions about any agent: *who is behind it, what may it do, is it still trusted right now*. Its doctrine is "login
is ours; the decision is the verifier's."

**Honest status.** AINRA runs on a **TEST-ROOT** staging network. Its production root is created only at a recorded
genesis ceremony that has not happened yet, and it needs three external real-world events (the ceremony, at least
three independent verifiers, a revocation soak) before its prototype ships. So today every AINRA verdict, in
MyLiquid too, is labelled `TESTBED · TEST-ROOT`.

### Role 1: MyLiquid checks connected agents' passports (built in this change)

MyLiquid is an AINRA **verifier**. When an investor connects their own AI over MCP, they can pin the API key to that
agent's AINRA identity:

1. **Verify and pin.** On **Connect**, paste the agent's passport, or try the TEST-ROOT samples. MyLiquid verifies
   it locally with `@ainra/sdk` and shows the agent, its AINRA Number, tier and capabilities. **Pin to key** records
   the Number against the key. Only a valid passport can be pinned.
2. **Present.** The agent sends its passport with its key: `POST /api/agent-identity` with body
   `{"ainra_passport": …}`. The body is used because bundles are 35 KB or more, over most header limits. A valid
   passport for the pinned Number opens a **5-minute** window, matching AINRA's F2 freshness.
3. **Gate.** Outside that window, `/api/mcp` and the x402 data API refuse a pinned key with a message that says how
   to fix it. Inside it:
   - scopes narrow to the passport's `myliquid:read` / `myliquid:trade` / `myliquid:pay` capabilities (if it
     declares any);
   - scopes narrow to MyLiquid's **tier floor**: L0–L1 read, L2 trade, L3+ pay, following the Standard's "standard
     commerce" (L2) and "consumer-scale payments" (L3) lanes.
4. **Revoke.** If the registrar revokes the agent, its next presentation is refused (`revoked`). The key is cut off
   even though it is still valid, and Sentinel raises a critical alert. Presenting another agent's valid passport
   is refused as `identity_mismatch`.
5. **Attribute.** Every MCP call from a pinned key is logged with the agent's AINRA Number.

**Why it's useful for a money app.** API keys prove *possession*. AINRA adds *who is behind the agent*, a tier that
says how much consequence it has earned, and revocation that its operator or registrar controls. That is exactly
what you want before an outside agent can trade or pay.

**Limits, stated plainly:**

- A presentation is a bearer credential for its 5-minute window, bound to the API key (itself a secret) but not
  to each request. AINRA's RFC 9421 request signatures close this, and aren't in the published SDK yet.
- In testbed mode the samples are verified at their own issue time. At real time they correctly come back
  `stale_status`, because nobody is refreshing their revocation status.
- Instance credentials (ADR-019, a running copy's short-lived credential) are accepted only when `AINRA_AUDIENCE` is
  set. The default refuses them, as AINRA recommends.

**Configuration:**

- `AINRA_ROOTS_FILE` and `AINRA_DIRECTORY_FILE` point at the published root keys and root-signed registrar
  directory. Unset means testbed.
- `AINRA_AUDIENCE` is this service's audience, for instance credentials.

### Role 2: MyLiquid's pets carry AINRA passports (next)

"MyLiquid as AINRA's user" in the fullest sense: MyLiquid becomes an **operator** whose agents hold passports, so
merchants, APIs and other platforms can check them offline.

1. **Accreditation.** MyLiquid registers as an operator with an accredited registrar, for example as
   `ainra:registrar-NN:myliquid:…`. Target **L2** (KYB-verified operator) for trading agents and **L3** for
   consumer-scale payments.
2. **One lineage per pet**, e.g. `ainra:registrar-NN:myliquid:pet-<id>@1.0.0`, issued when the account is created:
   - capabilities `pay:pos`, `pay:x402` and `read:portfolio`;
   - `scope_ceiling` derived from the agent card policy.

   Identity is permanent and the credential renews yearly (AINRA ADR-017).
3. **Instance credentials per session** (ADR-019): the pet's running session gets a credential of an hour or less,
   bound to a key only it holds. The passport's control key never leaves MyLiquid's signing side.
4. **Revocation from product events:** freezing the agent card, deleting the account or putting the pet to sleep
   revokes or suspends the passport. AINRA propagates revocation fail-closed within minutes.
5. **Merchants verify.** The POS terminal and any x402 API verify the paying pet's passport with `@ainra/sdk`
   before they accept "Drip, agent of Alex". The receipt then carries the verdict event (Number, tier).
6. **Tooling:** AINRA ships a registrar console, a CLI (`ainra issue|renew|revoke`), `@ainra/middleware` and an MCP
   server (`ainra_verify`, `ainra_status`, …) that Claude can use alongside MyLiquid's own MCP server.

### Role 3: helping AINRA reach genesis

AINRA's production root needs **at least three independent external verifiers**, each proving verification on a
fresh challenge (`make verify-as-external`, then a pull request under `evidence/verifier/`). A platform that already
verifies AINRA passports in production code is a natural candidate. It needs a person at MyLiquid to request a
challenge and run the kit. That's an organisational step, not code.

## Sources

- AINRA repository: README, `skills.md`, `docs/PRESENTATION.md`, `docs/AINRA_I_The_Standard.md` (tiers,
  verification), `docs/quickstarts/*`, `evidence/README.md`, `packages/sdk-ts`, `packages/middleware`
  (Apache-2.0 OR MIT). The TEST-ROOT sample artifacts MyLiquid bundles come from `kits/verifier/sample-artifacts/`
  (see `src/lib/ainra/testbed/README.md`).
- `@ainra/sdk` 0.4.1 on npm (Sigstore provenance).
- The live site ainra.vercel.app was not reachable from the build environment, so this note relies on the
  repositories behind it (`JacobJandon/ainra`, `JacobJandon/ainra-website`).
