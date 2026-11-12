# Brand: MyLiquid

The name is **decided** (`docs/startup/plan.md` §12: MyLiquid for the company and the app, "Gate" and "Arena" as
product names). This section checks it rather than reopening it, and briefs the look and voice for Gate's buyer.

## 1. The name: checks to finish, and one risk

| Check | What to do | Status |
| --- | --- | --- |
| Trademark, US | [USPTO search](https://tmsearch.uspto.gov/) for MYLIQUID and MYLIQUID GATE in Class 9 (software), 36 (financial services), 42 (SaaS) | To run |
| Trademark, EU / UK | [EUIPO eSearch](https://euipo.europa.eu/eSearch/), [UKIPO](https://trademarks.ipo.gov.uk/ipo-tmtext), same classes | To run |
| Domain | myliquid.com and .ai, plus gate.myliquid.com for the product | Could not check from this session (network policy); check at a registrar |
| Handles | LinkedIn company page first (the B2B channel), then X and GitHub | To run |
| Confusion | No competitor in `competitors.md` uses "Liquid" | Clear |

**The risk.** "Liquid" was the name of a crypto exchange FTX bought in 2022, which
[halted withdrawals](https://decrypt.co/114666/liquid-global-halts-withdrawals-ftx-contagion-continues?amp=1) when FTX
failed ([acquisition](https://www.theblock.co/post/132746/ftx-liquid-acquisition-japan-crypto-exchange)). Crypto
venues are half of Gate's first audience, and a compliance officer may make that association. Mitigation without a
rename: lead B2B materials with the product name, **"Gate, by MyLiquid"**, and keep "liquid" meaning *liquidity you
can see* (the app's liquidity ladder), never "a liquid token". Alternatives if a trademark search fails, for the
founder to weigh, not adopted: *Gatekeep*, *Mandate*, *Tollgate*, *Kya Gate* (each needs the same checks). Public
searches only; a trademark lawyer confirms, and nothing is registered until it is filed.

## 2. Promise, taglines, voice

- **Promise (Gate):** *You will always know what every agent did on your customers' accounts, and why it was allowed.*
- **Taglines:** "Every agent action, decided and kept." · "Agent access, with the evidence." · "Let agents in. Keep
  the proof."
- **Voice: plain, exact, calm.**
  - Plain: do say "it never sits in your order path"; don't say "frictionless, seamless governance".
  - Exact: do say "SOC 2 audit planned, not started"; don't say "enterprise-grade security".
  - Calm: do say "an examiner may ask"; don't say "regulators are coming for you".
  - Before: "a runtime governance layer for AI agents". After: "Gate decides whether an AI agent may make a trade or
    payment, and keeps the proof."

## 3. The look (brief)

The system already exists: **Paper & Pixels 2** (`docs/design/rules.md`). For Gate's buyer, use its sober half: paper,
ink and blue; the lime highlighter at most once a page; no pet on `/business` (the board asked why a compliance demo
features a Tamagotchi).

| Colour | Hex | Job | Contrast |
| --- | --- | --- | --- |
| Ink | #111111 | Text, primary buttons | 17:1 on paper |
| Paper | #f5f3ee | Background | — |
| Liquid blue | #2f5bff | Links, focus, the primary button's shadow | 5.2:1 on white (AA) |
| Muted | #716e66 | Meta text only | 4.6:1 on paper (AA) |
| Lime | #c8f560 | Highlighter, one phrase a page | Ink on lime 15:1 |

Type: Inter Tight (display), Inter (text), Geist Mono (numbers), Silkscreen (pixel labels): all free on Google Fonts
under the SIL Open Font License. Logo: the living orb (`components/brand/LogoMark.tsx`) stays; for Gate add a
wordmark lock-up "Gate, by MyLiquid" that works at 32 px.

**The first five touchpoints:** (1) `/business`, opening on the shadow replay; (2) the shadow report a firm receives
after a replay; (3) the pilot invoice and receipt; (4) the first LinkedIn post (hook 5); (5) the reply to the first
complaint: within one business day, what happened, what we changed, in the voice above.
