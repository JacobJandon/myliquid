/** The design directions at /designs, and what each takes from the study (docs/design/study.md). */
export const DIRECTIONS = [
  {
    id: "field-notes",
    n: 1,
    name: "Field Notes",
    after: "graphify.com, Modern Treasury, Linear",
    pitch:
      "A technical notebook: sharp 2 px corners, Geist with a mono voice, our pixel type for labels, deep green ink, and the system drawn as a live diagram. Proposals read like diffs.",
    bestFor: "Credibility with builders, brokers and Gate buyers.",
    swatches: ["#ffffff", "#0d1f17", "#12804a", "#c8f560", "#a3462a"],
  },
  {
    id: "night-market",
    n: 2,
    name: "Night Market",
    after: "Robinhood, Mercury, Linear, Resend",
    pitch:
      "Near-black, a big light serif, our lime as the only loud colour, full pills, the pet glowing like a screen at night. Green only ever means money went up.",
    bestFor: "A consumer app people show their friends.",
    swatches: ["#0b0b0c", "#141416", "#f4f4f0", "#c8f560", "#ff6b5b"],
  },
  {
    id: "quiet-wealth",
    n: 3,
    name: "Quiet Wealth",
    after: "Wealthfront, Stripe, Modern Treasury",
    pitch:
      "A private bank that happens to have agents: cool off-white, a light serif for headings, soft layered cards with real depth, our blue as the one accent, a lot of air.",
    bestFor: "Trust with people moving real savings, later.",
    swatches: ["#f6f7fb", "#ffffff", "#14162b", "#2f5bff", "#0f9d58"],
  },
  {
    id: "paper-pixels",
    n: 4,
    name: "Paper & Pixels 2",
    after: "today's MyLiquid, YC, PostHog",
    pitch:
      "Our current brand, evolved: lighter and tighter headlines, mono numbers, one 14 px radius, hard shadows only on the one thing that matters, and the pet as a companion row on Home.",
    bestFor: "Keeping what's ours while fixing what the study found.",
    swatches: ["#f5f3ee", "#111111", "#2f5bff", "#c8f560", "#c9d4b1"],
  },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]["id"];
