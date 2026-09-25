/**
 * Every MyLiquid account adopts a "Liquid": a small, living agent that leads the
 * desk. Its vitals move in real time like a Tamagotchi, but it is designed around
 * good money habits: it gets happier when the portfolio is healthy, liquid and
 * reviewed, and it earns XP for discipline (check-ins, decisions, diligence),
 * never for trading volume. Pure functions only.
 */

export const PET_COLORS = {
  blue: "#3b6bff",
  lime: "#7cc414",
  pink: "#ff5fa2",
  orange: "#ff7a1a",
  violet: "#7b5cff",
} as const;
export type PetColor = keyof typeof PET_COLORS;

export function isPetColor(value: string): value is PetColor {
  return value in PET_COLORS;
}

export interface CompanionRecord {
  name: string;
  color: PetColor;
  bornAt: string;
  xp: number;
  fullness: number;
  fullnessAt: string;
  energy: number;
  energyAt: string;
  joy: number;
  joyAt: string;
  streak: number;
  lastCheckinDay: string | null;
  lastLevel: number;
}

/** What the pet can sense about the investor's money. */
export interface PortfolioSignals {
  criticalAlerts: number;
  warnAlerts: number;
  topAlertTitle: string | null;
  pendingProposals: number;
  pendingPayments: number;
  liquidWeekPct: number;
  killSwitch: boolean;
  circuitBreaker: boolean;
  holdings: number;
  walletCents: number;
  lastPayment: { merchant: string; amountCents: number; hoursAgo: number } | null;
}

export type Mood =
  | "ecstatic"
  | "happy"
  | "content"
  | "worried"
  | "anxious"
  | "sad"
  | "hungry"
  | "tired"
  | "sleeping"
  | "scared";

export interface Vitals {
  fullness: number;
  energy: number;
  joy: number;
  health: number;
  moodScore: number;
  mood: Mood;
}

// ── Real-time decay ─────────────────────────────────────────────────────────

const HOUR_MS = 3_600_000;
export const FULLNESS_PER_HOUR = -4;
export const ENERGY_PER_HOUR = 8;
/** Joy drifts back toward a neutral 45 over time. */
export const JOY_BASELINE = 45;
export const JOY_DRIFT_PER_HOUR = 2;

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export function hoursBetween(fromIso: string, to: Date): number {
  return Math.max(0, (to.getTime() - new Date(fromIso).getTime()) / HOUR_MS);
}

export function currentFullness(
  c: Pick<CompanionRecord, "fullness" | "fullnessAt">,
  now: Date,
): number {
  return clamp(c.fullness + FULLNESS_PER_HOUR * hoursBetween(c.fullnessAt, now));
}

export function currentEnergy(
  c: Pick<CompanionRecord, "energy" | "energyAt">,
  now: Date,
  sleeping = false,
): number {
  const rate = sleeping ? ENERGY_PER_HOUR * 2 : ENERGY_PER_HOUR;
  return clamp(c.energy + rate * hoursBetween(c.energyAt, now));
}

export function currentJoy(c: Pick<CompanionRecord, "joy" | "joyAt">, now: Date): number {
  const drift = JOY_DRIFT_PER_HOUR * hoursBetween(c.joyAt, now);
  return c.joy > JOY_BASELINE
    ? Math.max(JOY_BASELINE, c.joy - drift)
    : Math.min(JOY_BASELINE, c.joy + drift);
}

/** Portfolio health as the pet feels it: alerts and liquidity. */
export function portfolioHealth(s: PortfolioSignals): number {
  let h = 100 - 30 * s.criticalAlerts - 12 * s.warnAlerts;
  if (s.holdings > 0 && s.liquidWeekPct < 0.5) h -= 15;
  return clamp(h);
}

export function computeVitals(c: CompanionRecord, s: PortfolioSignals, now: Date): Vitals {
  const sleeping = s.killSwitch;
  const fullness = currentFullness(c, now);
  const energy = currentEnergy(c, now, sleeping);
  const joy = currentJoy(c, now);
  const health = portfolioHealth(s);
  const moodScore = Math.round(0.35 * health + 0.25 * joy + 0.2 * fullness + 0.2 * energy);

  let mood: Mood;
  if (sleeping) mood = s.circuitBreaker ? "scared" : "sleeping";
  else if (fullness < 20) mood = "hungry";
  else if (energy < 15) mood = "tired";
  else if (s.criticalAlerts > 0) mood = "anxious";
  else if (moodScore >= 85) mood = "ecstatic";
  else if (moodScore >= 70) mood = "happy";
  else if (moodScore >= 55) mood = "content";
  else if (moodScore >= 40) mood = "worried";
  else mood = "sad";

  return {
    fullness: Math.round(fullness),
    energy: Math.round(energy),
    joy: Math.round(joy),
    health,
    moodScore,
    mood,
  };
}

// ── Levels and evolution ────────────────────────────────────────────────────

export const LEVEL_XP = [0, 40, 120, 250, 450, 750, 1150, 1700, 2400, 3300];

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  if (xp >= LEVEL_XP[LEVEL_XP.length - 1]!)
    level += Math.floor((xp - LEVEL_XP[LEVEL_XP.length - 1]!) / 1000);
  return level;
}

export function levelProgress(xp: number): {
  level: number;
  into: number;
  span: number;
  pct: number;
} {
  const level = levelForXp(xp);
  const base =
    level <= LEVEL_XP.length
      ? LEVEL_XP[level - 1]!
      : LEVEL_XP[LEVEL_XP.length - 1]! + (level - LEVEL_XP.length) * 1000;
  const next = level < LEVEL_XP.length ? LEVEL_XP[level]! : base + 1000;
  const into = xp - base;
  const span = next - base;
  return { level, into, span, pct: span > 0 ? into / span : 1 };
}

export type Stage = "drop" | "droplet" | "splash" | "wave" | "tide";

export const STAGES: { id: Stage; name: string; fromLevel: number; blurb: string }[] = [
  { id: "drop", name: "Drop", fromLevel: 1, blurb: "Just hatched. Curious about everything." },
  { id: "droplet", name: "Droplet", fromLevel: 3, blurb: "Knows your limits by heart." },
  { id: "splash", name: "Splash", fromLevel: 5, blurb: "Spots red flags before you do." },
  { id: "wave", name: "Wave", fromLevel: 7, blurb: "Calm in any market." },
  { id: "tide", name: "Tide", fromLevel: 9, blurb: "A seasoned steward of your money." },
];

export function stageForLevel(level: number): (typeof STAGES)[number] {
  let stage = STAGES[0]!;
  for (const s of STAGES) if (level >= s.fromLevel) stage = s;
  return stage;
}

// ── XP: rewarded habits ─────────────────────────────────────────────────────

export type XpAction =
  | "checkin"
  | "feed"
  | "play"
  | "decide_proposal"
  | "desk_cycle"
  | "agent_run"
  | "dismiss_alert"
  | "agent_payment"
  | "quest";

/** XP per action and how many times a day it counts. Trading volume earns nothing. */
export const XP_RULES: Record<XpAction, { xp: number; dailyCap: number }> = {
  checkin: { xp: 10, dailyCap: 1 },
  feed: { xp: 5, dailyCap: 3 },
  play: { xp: 8, dailyCap: 3 },
  decide_proposal: { xp: 6, dailyCap: 10 },
  desk_cycle: { xp: 8, dailyCap: 1 },
  agent_run: { xp: 2, dailyCap: 5 },
  dismiss_alert: { xp: 2, dailyCap: 5 },
  agent_payment: { xp: 3, dailyCap: 5 },
  quest: { xp: 15, dailyCap: 3 },
};

/** Streak bonus on the daily check-in: +1 XP per consecutive day, up to +10. */
export function checkinBonus(streak: number): number {
  return Math.min(Math.max(streak - 1, 0), 10);
}

/** The streak after checking in today, or null if the investor already checked in today. */
export function streakAfterCheckin(
  lastCheckinDay: string | null,
  today: string,
  currentStreak: number,
): number | null {
  if (lastCheckinDay === today) return null;
  if (!lastCheckinDay) return 1;
  const diff = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastCheckinDay}T00:00:00Z`)) / 86_400_000,
  );
  return diff === 1 ? currentStreak + 1 : 1;
}

// ── Daily quests ────────────────────────────────────────────────────────────

export type QuestId = "desk" | "decide" | "feed" | "play" | "pay";

export const QUESTS: Record<QuestId, { title: (pet: string) => string; completedBy: XpAction }> = {
  desk: { title: () => "Run your agent desk", completedBy: "desk_cycle" },
  decide: { title: () => "Approve or reject a proposal", completedBy: "decide_proposal" },
  feed: { title: (pet) => `Feed ${pet} a research snack`, completedBy: "feed" },
  play: { title: () => "Ace a quiz in Play", completedBy: "play" },
  pay: { title: () => "Pay for something with your agent card", completedBy: "agent_payment" },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Three quests per investor per day, chosen deterministically. */
export function questsForDay(investorId: string, day: string): QuestId[] {
  const pool = Object.keys(QUESTS) as QuestId[];
  const picked: QuestId[] = [];
  let seed = hash(`${investorId}:${day}`);
  while (picked.length < 3) {
    const q = pool[seed % pool.length]!;
    if (!picked.includes(q)) picked.push(q);
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177) >>> 0;
  }
  return picked;
}

// ── Play: quizzes about your own portfolio ──────────────────────────────────

export type QuizKind = "liquidity" | "cash" | "largest";

export interface Quiz {
  kind: QuizKind;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** What a quiz can ask about. */
export interface QuizFacts {
  liquidWeekPct: number;
  cashPct: number;
  /** Holdings by descending weight. */
  holdings: { name: string; weight: number }[];
}

function shuffled<T>(values: T[], seed: string): { order: number[]; values: T[] } {
  const order = values.map((_, i) => i).sort((x, y) => hash(`${seed}:${x}`) - hash(`${seed}:${y}`));
  return { order, values: order.map((i) => values[i]!) };
}

/** A percentage question: the true answer and two decoys on either side. */
function percentChoices(
  truthPct: number,
  seed: string,
): { options: string[]; answerIndex: number } {
  const truth = Math.round(truthPct * 100);
  const offsets = [-25, -15, 15, 25].filter((o) => truth + o >= 0 && truth + o <= 100);
  const h = hash(seed);
  const a = offsets[h % offsets.length] ?? 20;
  const rest = offsets.filter((o) => Math.sign(o) !== Math.sign(a));
  const b = rest[(h >>> 3) % Math.max(rest.length, 1)] ?? -a;
  const values = [truth, truth + a, truth + b].map((v) => `${Math.max(0, Math.min(100, v))}%`);
  const { order, values: options } = shuffled(values, seed);
  return { options, answerIndex: order.indexOf(0) };
}

/** Quiz kinds that make sense for this portfolio. */
export function quizKinds(facts: QuizFacts): QuizKind[] {
  const kinds: QuizKind[] = ["liquidity"];
  if (facts.holdings.length > 0) kinds.push("cash");
  if (facts.holdings.length >= 3) kinds.push("largest");
  return kinds;
}

/** Play: a question about the investor's own portfolio, chosen by seed. The answer is always true. */
export function playQuiz(facts: QuizFacts, seed: string): Quiz {
  const kinds = quizKinds(facts);
  const kind = kinds[hash(`kind:${seed}`) % kinds.length]!;
  if (kind === "largest") {
    const { order, values } = shuffled(
      facts.holdings.slice(0, 3).map((h) => h.name),
      seed,
    );
    const top = facts.holdings[0]!;
    return {
      kind,
      question: "Which is your biggest position?",
      options: values,
      answerIndex: order.indexOf(0),
      explanation: `${top.name} is ${(top.weight * 100).toFixed(1)}% of the portfolio. Anything above 25% in one position deserves a second look.`,
    };
  }
  if (kind === "cash") {
    return {
      kind,
      question: "How much of your portfolio is cash right now?",
      ...percentChoices(facts.cashPct, seed),
      explanation: "A small cash buffer is healthy, but idle cash drifts away from your targets.",
    };
  }
  return {
    kind,
    question: "How much of your money could be cash within 7 days?",
    ...percentChoices(facts.liquidWeekPct, seed),
    explanation:
      "Settlement, notice periods, quarterly gates and lock-ups all count. The liquidity ladder shows the details.",
  };
}

// ── Feed: research snacks ───────────────────────────────────────────────────

export interface SnackFacts {
  totalCents: number;
  dayChangeCents: number;
  liquidWeekPct: number;
  cashCents: number;
  topHolding: { name: string; weight: number } | null;
  lockedPositions: number;
  nextUnlock: string | null;
  pendingProposals: number;
  pendingPayments: number;
  walletCents: number;
}

/** Whole dollars for big sums, where cents are noise. */
function roundDollars(cents: number): string {
  return formatDollars(Math.round(cents / 100) * 100);
}

/** True, useful facts about the portfolio. Feeding serves one of them. */
export function researchSnacks(f: SnackFacts): string[] {
  const snacks: string[] = [];
  const prev = f.totalCents - f.dayChangeCents;
  const pct = prev !== 0 ? (f.dayChangeCents / prev) * 100 : 0;
  snacks.push(
    `Your portfolio is ${roundDollars(f.totalCents)}, ${f.dayChangeCents >= 0 ? "up" : "down"} ${roundDollars(Math.abs(f.dayChangeCents))} (${Math.abs(pct).toFixed(2)}%) on the last market day.`,
  );
  snacks.push(`${Math.round(f.liquidWeekPct * 100)}% of your money could be cash within 7 days.`);
  if (f.topHolding) {
    snacks.push(
      `Your biggest position is ${f.topHolding.name} at ${(f.topHolding.weight * 100).toFixed(1)}% of the portfolio.`,
    );
  }
  if (f.lockedPositions > 0) {
    snacks.push(
      `${f.lockedPositions} position${f.lockedPositions === 1 ? " is" : "s are"} locked${f.nextUnlock ? `. The next unlock is ${f.nextUnlock}` : ""}.`,
    );
  }
  snacks.push(`You hold ${roundDollars(f.cashCents)} in cash.`);
  if (f.pendingProposals || f.pendingPayments) {
    const parts = [
      f.pendingProposals
        ? `${f.pendingProposals} proposal${f.pendingProposals === 1 ? "" : "s"}`
        : null,
      f.pendingPayments
        ? `${f.pendingPayments} payment${f.pendingPayments === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);
    snacks.push(
      `${parts.join(" and ")} ${parts.length > 1 || f.pendingProposals > 1 || f.pendingPayments > 1 ? "are" : "is"} waiting for your OK.`,
    );
  }
  if (f.walletCents > 0) snacks.push(`The agent wallet holds ${formatDollars(f.walletCents)}.`);
  return snacks;
}

// ── Stats screen ────────────────────────────────────────────────────────────

/** Tamagotchi-style hearts: 0–4 filled for a 0–100 meter. */
export function hearts(value: number): number {
  return Math.max(0, Math.min(4, Math.round(value / 25)));
}

/** Whole days since the pet was adopted. */
export function ageInDays(bornAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(bornAt)) / 86_400_000));
}

// ── Calls for attention ─────────────────────────────────────────────────────

/**
 * Like a Tamagotchi's call light: why the pet wants you right now, or null.
 * Money that needs a human decision comes first, then the pet's own needs.
 */
export function attentionReason(v: Vitals, s: PortfolioSignals): string | null {
  if (s.circuitBreaker) return "The circuit breaker paused every agent";
  if (s.pendingPayments > 0)
    return `${s.pendingPayments} payment${s.pendingPayments === 1 ? " needs" : "s need"} your OK`;
  if (s.criticalAlerts > 0) return "A critical alert needs a look";
  if (s.pendingProposals > 0)
    return `${s.pendingProposals} proposal${s.pendingProposals === 1 ? " is" : "s are"} waiting`;
  if (s.killSwitch) return null; // asleep: it only calls for money matters
  if (v.fullness < 25) return "Hungry: feed it a research snack";
  if (v.energy < 15) return "Tired: let it rest";
  return null;
}

/** Open alerts pile up on the screen as messes, up to three. Reviewing them tidies up. */
export function messCount(s: PortfolioSignals): number {
  return Math.min(3, s.criticalAlerts + s.warnAlerts);
}

// ── Thoughts ────────────────────────────────────────────────────────────────

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: cents % 100 === 0 ? 0 : 2, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;
}

/** What the pet says right now. Deterministic, driven by state. */
export function petThought(opts: {
  name: string;
  vitals: Vitals;
  signals: PortfolioSignals;
  streak: number;
  openQuest: string | null;
  hourSeed: number;
}): string {
  const { vitals, signals: s } = opts;
  switch (vitals.mood) {
    case "scared":
      return "The portfolio dropped hard, so I pulled the brakes. Everything's paused until you wake me.";
    case "sleeping":
      return "Zzz… all agents are paused. Wake me when you want us back on duty.";
    case "hungry":
      return "I'm running on empty. A research snack would help me think straight.";
    case "tired":
      return "I've been working hard. Give me a little while to recharge.";
    case "anxious":
      return `${s.topAlertTitle ?? "Something needs attention"}. Want me to look into it?`;
  }
  if (s.pendingPayments > 0)
    return `A payment is waiting for your OK. I won't spend a cent without it.`;
  if (s.pendingProposals > 0) {
    return `I left ${s.pendingProposals} idea${s.pendingProposals === 1 ? "" : "s"} in your inbox. No rush, but I'm curious what you think.`;
  }
  if (s.holdings === 0)
    return "We haven't invested anything yet. Run the desk and I'll draft a first allocation for you.";
  if (s.lastPayment && s.lastPayment.hoursAgo < 12) {
    return `Paid ${s.lastPayment.merchant} ${formatDollars(s.lastPayment.amountCents)}. The wallet has ${formatDollars(s.walletCents)} left.`;
  }
  const options = [
    `${Math.round(s.liquidWeekPct * 100)}% of your money could be cash within a week. I like knowing that.`,
    opts.streak > 1
      ? `${opts.streak}-day streak! Discipline beats timing.`
      : "Check in every day and I'll grow faster.",
    opts.openQuest
      ? `Today's quest: ${opts.openQuest.charAt(0).toLowerCase()}${opts.openQuest.slice(1)}.`
      : "All of today's quests are done. Proud of us.",
    s.warnAlerts > 0
      ? `There ${s.warnAlerts === 1 ? "is" : "are"} ${s.warnAlerts} small thing${s.warnAlerts === 1 ? "" : "s"} to tidy up in Alerts.`
      : "No red flags today. Nice and calm.",
  ];
  return options[opts.hourSeed % options.length]!;
}
