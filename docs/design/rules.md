# Paper & Pixels 2: rules for type, placement and motion

The house style for the website and the app. It is today's brand (cream paper, ink, liquid blue, a lime pop, the
Tamagotchi) tightened with what the design study found (`docs/design/study.md`). The tokens and utilities live in
`src/app/globals.css`; this page says how to use them. When a screen breaks a rule, fix the screen or change the rule
here, not both quietly.

## 1. Type

| Role | Utility | Size | Weight · tracking · leading | Used for |
| --- | --- | --- | --- | --- |
| Hero | `type-hero` | 44 → 68 px | 600 · −0.04em · 1.04 | the landing headline, one per page |
| Section | `type-h2` | 30 → 44 px | 600 · −0.035em · 1.08 | landing section heads |
| Page | `type-h1` | 28 → 32 px | 600 · −0.03em · 1.1 | the title of an app page |
| Sub | `type-h3` | 20 → 24 px | 600 · −0.02em · 1.2 | tiles, panel heads |
| Card title | `type-title` | 15 px | 600 · −0.01em · 1.35 | a card's or row's name |
| Lede | `type-lede` | 17 → 18 px | 400 · 0 · 1.6 | the paragraph under a heading |
| Body | (default) | 14 → 15 px | 400 · 0 · 1.55 | everything else |
| Kicker | `kicker` | 10 → 11 px | pixel caps | the label above a heading or a number |
| Number | `num` | any | mono, tabular | amounts, percentages, dates, ids |
| Big number | `num-xl` | 36 → 44 px | display 600 · −0.035em | the one figure a screen is about |

- **Tighter as it gets bigger.** 40 px and up: −0.04em. 24–39 px: −0.03em. 16–23 px: −0.01em. Body: 0.
- **Display type is 600, never 800.** Bold display read as shouting at our sizes; the study's best sites sit at
  500–600.
- **A mono voice for numbers and labels.** Geist Mono for small figures (`num`), Silkscreen only for kickers and the
  pet's screen. Big figures stay in the display face.
- **Smallest sizes.** Nothing under 11 px except pixel kickers (10 px) and legal fine print (11 px).

## 2. Placing text

1. **One left edge per block.** A kicker, its heading, the lede and the actions start on the same x. Don't centre
   anything longer than one line; we don't centre at all on app screens.
2. **The order is fixed:** kicker (optional) → heading → lede → content → actions. Don't put a button above the text
   that explains it.
3. **Spacing follows the order:** kicker→heading 8 px, heading→lede 12–16 px, lede→content 32 px,
   content→actions 24 px. Landing sections are 96 px apart on desktop, 64 px on phones. Use multiples of 4.
4. **Proximity beats lines.** A label sits closer to its value (4 px) than to the next pair (16 px or more). Add a
   divider only when spacing can't do it.
5. **Measure.** Body copy 45–65 characters a line (`max-w-[60ch]`), ledes 52 (`type-lede` does it), headings stop at
   about 20 characters a line (`max-w-[20ch]` on wide heroes) so they wrap into a shape.
6. **No widows, no ragged towers.** Headings balance (`text-wrap: balance`), paragraphs wrap pretty
   (`text-wrap: pretty`); both are global. A highlighted phrase is three words at most and never breaks
   (`highlight` sets `nowrap`).
7. **Numbers line up.** In tables and lists, text is left-aligned and numbers right-aligned in `num`; the currency
   symbol is attached; a change always carries its sign (+/−), so colour is never the only signal.
8. **Cards read in a Z.** Title top-left, the card's one action top-right on the same line, body at the same inset
   (16 px phone, 20 px desktop), footer actions bottom-left with the primary first.
9. **Buttons.** Verb first, three words or fewer, sentence case, no full stop, never wrap. One primary per region;
   the rest are secondary or ghost. A decision (Approve) is at least 40 px tall.
10. **Case and punctuation.** Sentence case everywhere; capitals only in pixel kickers. Landing display headings end
    with a full stop (it's our voice); card titles, buttons and labels don't.
11. **Contrast.** Sentences use `fg` or `fg-2`. `muted` (4.6:1 on paper) is for meta only: dates, units, hints.
    Status colours are never used for long text.
12. **Navigation.** Five items at most in the landing header. On phones the tab bar holds five.

## 3. Shape and emphasis

- **One radius: 14 px** for cards and panels (`rounded-card`), 10 px inside them, full pills for buttons and chips.
- **Hard shadows mark the thing to act on.** At most one hard-shadowed object per screen height: the decision card on
  Home, the hero object on the landing, the primary button (its shadow is blue). Everything else is a 1 px line.
- **Lime is a highlighter, blue is the brand, ink is for actions.** Never put lime under long text, never use blue
  for a destructive action.

## 4. Motion

Motion explains what happened; it never decorates money.

| Token | Value | Used for |
| --- | --- | --- |
| `--dur-press` | 120 ms | a button going down |
| `--dur-state` | 180 ms | hover, toggles, tabs |
| `--dur-enter` | 560 ms | something arriving |
| `--dur-draw` | 1000 ms | a chart drawing over time |
| `--ease-out` | cubic-bezier(.2,.7,.2,1) | entrances and presses |
| stagger | 70 ms × index, six items at most | lists and groups arriving |

1. **Each animation means something.** Rise = it just arrived. Lift (the hard shadow growing) = this needs you.
   Wipe left to right = time passing on a chart. Grow = an amount. Pop = an event (a payment, a check).
2. **Numbers never spin, count or flash.** A figure is shown at its value; only its surroundings move.
3. **Once.** Entrances run the first time something appears, not on every update. In the app only the portfolio
   chart, the decision card and the bars animate; navigation is instant.
4. **Loops are rare.** Only the pet, the logo orb, the "waiting" dot and the landing's floating chips loop.
5. **Never hide content waiting for motion.** Every animation is CSS with a visible end state and no JavaScript
   gate; scroll reveals use scroll-driven animations where the browser supports them and show plainly where it doesn't.
6. **Reduced motion wins.** `prefers-reduced-motion: reduce` removes every animation; the page looks finished.
7. **Cheap properties only:** transform, opacity, and clip-path for the chart wipe. Nothing that moves layout.

## 5. Checklist for a new screen

- [ ] One `type-h1` (app) or one `type-hero` (landing); headings balance.
- [ ] Every block reads kicker → heading → lede → content → actions on one left edge.
- [ ] Body lines under 65 characters; nothing smaller than 11 px.
- [ ] Numbers in `num`, right-aligned in columns, signed when they're changes.
- [ ] At most one hard shadow in view; one primary button per region.
- [ ] Animations are from the table above, run once, and vanish with reduced motion.
- [ ] Checked at 1440, 820, 390 and 360 px wide: no overflow, no clipped text.
