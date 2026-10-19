# Design study, October 2026

How the best recent YC and fintech sites are built, measured rather than eyeballed: each site was opened in
Chromium at 1440 and 390 px wide on GitHub's runners (`.github/workflows/design-study.yml`,
`scripts/design-study/measure.mjs`) and its type, colour by area, buttons, radii, layout and motion were read from
the computed styles. Screenshots are an artifact on the workflow run (kept 14 days). The design directions this
led to are at `/designs`.

## What was measured (desktop)

| Site | Display type | Weight · tracking | Ink / background | Accent | Buttons | Corners | Notes |
|---|---|---|---|---|---|---|---|
| **graphify.com** (YC S26) | Geist, h2 32 px | 520 · normal | #062314 forest ink on white | #118d4f green; rust #9a3f28 brand | 32–40 px, weight 520 | **2 px everywhere** | Geist Mono + Departure Mono (pixel mono), 755 px column, a live graph on canvas, ~100 SVG diagrams, 38 animations, reduced-motion respected |
| robinhood.com | Martina Plantijn serif 110 px | 400 · −0.5 | white on black | **#ccff00 lime** | pill, 44 px | 36 px | serif display + Capsule Sans; lime panels; video |
| mercury.com (YC) | Arcadia Display 49 px | 480 | #ededf3 on #171721 | #5266eb | pill, 40 px | 4–12 px | dark, canvas + video, quiet |
| stripe.com | Söhne 48 px | **300** · −0.96 | #061b31 on white | #533afd | 40–48 px | 4 px | 13 canvases (the gradient), long page |
| linear.app | Inter Variable 64 px | 510 · −1.4 | #f7f8f8 on #08090a | #e4f222 | pill, 32–44 px | 9–12 px | Berkeley Mono, 594 animations, dark |
| brex.com (YC) | Inter 72 px | 500 · −1.44 | #15191e on white | #ff3d00 | 36–48 px | 8–12 px | flat, no motion |
| moderntreasury.com (YC) | Neue display 71 px | 450 | #151515 on white | #29735c | **2 px**, 33–40 px | 2 px | mono labels, pastel section tints |
| increase.com | TT Interphases, h2 40 px | 600 | #1d2a36 on white | #e4ff33, #31f2bf | 36–46 px | 8–16 px | Input Mono, dark panels |
| wealthfront.com | Calibre 62 px | 700 · −1.86 | white on #18172b / #f8f7fc | #4840bb | 46 px | 6–16 px | GT Alpina serif accents |
| public.com | Denton serif 48 px | 300 | black on white | — | — | — | sells "AI Agents" that monitor markets and trade, in its hero |
| ramp.com | Lausanne 64 px | 400 | near-black on white | — | — | — | playful campaign hero |
| plaid.com | Plaid Sans 76 px | 500 · −3.4 | #111 on white, navy panels | #10d1b7 | pill, 40 px | 20–24 px | 7 canvases, Inconsolata |
| resend.com (YC) | Domaine serif 96 px | 400 · −0.96 | #f0f0f0 on black | #00a3ff | 41 px | 4–16 px | commit mono, glassy cards |
| browserbase.com (YC) | GT Planar, h2 45 px | 500 | black on white | #ff4500 | **pill**, 39 px | 99 px | GT Standard Mono, video |
| posthog.com (YC) | RoundHog 36 px | 800 | #111 on #eeefe9 | #f54e00 | 32–47 px | 4–8 px | a desktop-OS metaphor, playful |
| ycombinator.com | Source Serif / Outfit 48 px | 400 | #16140f on **#f5f5ee** | black | pill | 12 px | cream paper, black buttons |

## What the best of them share

1. **Big, light display type.** 48–110 px at weight 300–500 with tight negative tracking (−1 to −3 px). Nobody
   uses heavy bold display. Serif displays are back for consumer money (Robinhood, Public, Wealthfront, Resend).
2. **A mono voice.** Almost every site pairs its sans with a monospace for labels, numbers and code (Geist Mono,
   Berkeley Mono, Input Mono, Inconsolata). Graphify adds a pixel mono, close to our pet's pixel type.
3. **One neutral, one ink, one loud accent, used sparingly.** The accent is a single vivid colour (lime, orange,
   violet, blue) on 1–3% of the area. Robinhood's lime (#ccff00) is almost our own (#c8f560).
4. **Committed corners.** Either sharp (2–4 px: Graphify, Stripe, Modern Treasury) or full pills (Robinhood,
   Linear, Browserbase). The middle ground reads as generic.
5. **The product is the hero image.** Live diagrams, charts and app screens rather than illustrations or
   photos; developer-facing sites draw the system itself (Graphify's graph, Stripe's gradient on canvas).
6. **Compact controls.** Buttons 32–48 px tall, 13–16 px text.
7. **Calm motion that respects reduced-motion.** Most sites honour `prefers-reduced-motion`.
8. **Narrow reading columns** for prose (Graphify 755 px, Robinhood 648 px) inside wider layouts.

## What MyLiquid takes from this

- Lighter, larger display type with tight tracking; a mono for numbers, labels and agent output.
- One accent per screen; keep lime as the signature (it is also Robinhood's, so pair it with our blue and the pet
  to stay ours).
- Pick a corner language per direction and commit to it.
- Make the product the hero: the agent proposing, the checks passing, the money moving, on real screens.
- Keep motion calm and switchable.

Measurements are a snapshot of 19 October 2026; sites change.
