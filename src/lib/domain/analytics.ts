import { hashToUnit } from "./market";

/**
 * Product analytics and validation maths (pure). MyLiquid measures itself first-party: no third-party trackers,
 * no IP addresses, nothing for visitors who send Global Privacy Control or Do Not Track. See
 * docs/discovery/4-measure-and-iterate.md for how each number is used to decide what to build next.
 */

/** Every event MyLiquid records, and what it means. Anything else is refused. */
export const EVENTS = {
  landing_viewed: "A visitor saw the front page (props: variant of each running experiment).",
  cta_clicked: "A visitor clicked a call to action (props: cta, variant).",
  guest_started: "A visitor opened a guest account (the demo).",
  signed_up: "Someone created a saved account (props: fromGuest).",
  app_opened: "An account opened the app on a day (at most once per account per day).",
  trade_placed: "The investor placed an order themselves (props: productId, side).",
  proposal_decided: "The investor approved or rejected an agent's proposal (props: decision).",
  trader_hired: "The investor hired a hosted AI trader (props: kind).",
  agent_connected: "An outside agent enrolled with its AINRA passport (props: tier).",
  pmf_answered: "Someone answered the product-market-fit survey (props: answer).",
  waitlist_joined: "A visitor joined the early-access list (props: segment).",
  design_partner_requested: "A business asked to become a Gate design partner.",
  ainra_interest: "Someone asked about AINRA for their own agents or platform (props: role).",
  ainra_inspected: "The AINRA lab verified a passport (props: tamper, verdict).",
  gate_decided: "Gate decided on an action through the public API (props: decision, verified).",
} as const;

export type EventName = keyof typeof EVENTS;

export function isEventName(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENTS, name);
}

/** Events a browser may send itself; the rest are recorded only by the server, where they happen. */
export const CLIENT_EVENTS: EventName[] = ["landing_viewed", "cta_clicked"];

/** "Activated": the investor did something MyLiquid is for, beyond looking. */
export const ACTIVATION_EVENTS: EventName[] = [
  "trade_placed",
  "proposal_decided",
  "trader_hired",
  "agent_connected",
];

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests/i;

/** Whether to record anything for this request: not for bots, nor for visitors who opted out. */
export function shouldTrack(headers: {
  userAgent?: string | null;
  gpc?: string | null;
  dnt?: string | null;
}): boolean {
  if (headers.gpc === "1" || headers.dnt === "1") return false;
  return !BOT.test(headers.userAgent ?? "");
}

// ── Experiments ────────────────────────────────────────────────────────────

export interface Experiment {
  id: string;
  /** What we believe, and what would prove it wrong. */
  hypothesis: string;
  variants: readonly string[];
  /** The event that counts as converting. */
  goal: EventName;
}

export const EXPERIMENTS = {
  landing_headline: {
    id: "landing_headline",
    hypothesis:
      "Leading with safety (guardrails you set, agents that ask first) converts more visitors into the demo than leading with the pet. We keep the variant if it lifts guest starts by ≥20% at 95% confidence.",
    variants: ["pet", "safety"],
    goal: "guest_started",
  },
} as const satisfies Record<string, Experiment>;

export type ExperimentId = keyof typeof EXPERIMENTS;

/** A stable, even split: the same visitor always sees the same variant. */
export function assignVariant(subjectId: string, experiment: Experiment): string {
  const i = Math.floor(hashToUnit(`${experiment.id}:${subjectId}`) * experiment.variants.length);
  return experiment.variants[Math.min(i, experiment.variants.length - 1)]!;
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26), accurate to about 1e-7. */
function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export interface Comparison {
  rateA: number;
  rateB: number;
  /** B relative to A (0.2 = 20% better). */
  lift: number | null;
  z: number | null;
  /** Two-sided p-value. */
  p: number | null;
  significant: boolean;
}

/** Two-proportion z-test: is B's conversion rate really different from A's? */
export function compareRates(convA: number, nA: number, convB: number, nB: number): Comparison {
  const rateA = nA ? convA / nA : 0;
  const rateB = nB ? convB / nB : 0;
  const lift = rateA > 0 ? rateB / rateA - 1 : null;
  if (!nA || !nB) return { rateA, rateB, lift, z: null, p: null, significant: false };
  const pooled = (convA + convB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return { rateA, rateB, lift, z: null, p: null, significant: false };
  const z = (rateB - rateA) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { rateA, rateB, lift, z, p, significant: p < 0.05 };
}

/** Visitors per variant needed to detect `lift` over `baseRate` (95% confidence, 80% power). */
export function sampleSizePerVariant(baseRate: number, lift: number): number {
  const p1 = baseRate;
  const p2 = baseRate * (1 + lift);
  if (p1 <= 0 || p2 >= 1) return Infinity;
  const zA = 1.959964;
  const zB = 0.841621;
  const pBar = (p1 + p2) / 2;
  const n =
    (zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 /
    (p2 - p1) ** 2;
  return Math.ceil(n);
}

// ── Product-market fit (Sean Ellis) ──────────────────────────────────────────

export const PMF_ANSWERS = ["very", "somewhat", "not", "na"] as const;
export type PmfAnswer = (typeof PMF_ANSWERS)[number];

export const PMF_LABELS: Record<PmfAnswer, string> = {
  very: "Very disappointed",
  somewhat: "Somewhat disappointed",
  not: "Not disappointed (it isn't really that useful)",
  na: "N/A, I no longer use MyLiquid",
};

/** The benchmark: 40% "very disappointed" from at least 40 active users. */
export const PMF_BAR = 0.4;
export const PMF_MIN_RESPONSES = 40;

export function pmfScore(answers: PmfAnswer[]): {
  n: number;
  counts: Record<PmfAnswer, number>;
  veryShare: number;
  verdict: "not enough answers" | "product-market fit signal" | "not yet";
} {
  const counts = { very: 0, somewhat: 0, not: 0, na: 0 } as Record<PmfAnswer, number>;
  for (const a of answers) counts[a] += 1;
  // People who no longer use it don't count towards the share, as in Ellis's method.
  const n = counts.very + counts.somewhat + counts.not;
  const veryShare = n ? counts.very / n : 0;
  return {
    n,
    counts,
    veryShare,
    verdict:
      n < PMF_MIN_RESPONSES
        ? "not enough answers"
        : veryShare >= PMF_BAR
          ? "product-market fit signal"
          : "not yet",
  };
}

// ── Funnels and retention ────────────────────────────────────────────────────

/** How many subjects reached each step, in order: a step only counts if every earlier one was reached. */
export function funnel(steps: string[][], reached: Map<string, Set<string>>): number[] {
  const out: number[] = [];
  let alive: Set<string> | null = null;
  for (const names of steps) {
    const now = new Set<string>();
    for (const [subject, events] of reached)
      if ((!alive || alive.has(subject)) && names.some((n) => events.has(n))) now.add(subject);
    out.push(now.size);
    alive = now;
  }
  return out;
}

/**
 * Day-N retention: of the accounts whose first day is at least N days ago, the share active on day N or later
 * (within a week of it). `days` maps each account to the ISO days it was active, `today` bounds the cohort.
 */
export function retention(
  days: Map<string, string[]>,
  n: number,
  today: string,
): {
  cohort: number;
  retained: number;
  rate: number;
} {
  const DAY = 86_400_000;
  let cohort = 0;
  let retained = 0;
  for (const list of days.values()) {
    const sorted = [...list].sort();
    const first = Date.parse(sorted[0]!);
    if (Date.parse(today) - first < n * DAY) continue;
    cohort += 1;
    if (
      sorted.some((d) => {
        const gap = (Date.parse(d) - first) / DAY;
        return gap >= n && gap < n + 7;
      })
    )
      retained += 1;
  }
  return { cohort, retained, rate: cohort ? retained / cohort : 0 };
}
