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
  play: { title: () => "Ace the liquidity quiz", completedBy: "play" },
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

// ── The liquidity quiz (Play) ───────────────────────────────────────────────

export interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
}

/** "How much of your money could be cash within 7 days?" with the true answer and two decoys. */
export function liquidityQuiz(liquidWeekPct: number, seed: string): Quiz {
  const truth = Math.round(liquidWeekPct * 100);
  const offsets = [-25, -15, 15, 25].filter((o) => truth + o >= 0 && truth + o <= 100);
  const h = hash(seed);
  const a = offsets[h % offsets.length] ?? 20;
  const rest = offsets.filter((o) => Math.sign(o) !== Math.sign(a));
  const b = rest[(h >>> 3) % Math.max(rest.length, 1)] ?? -a;
  const values = [truth, truth + a, truth + b].map((v) => Math.max(0, Math.min(100, v)));
  const order = [0, 1, 2].sort((x, y) => hash(`${seed}:${x}`) - hash(`${seed}:${y}`));
  return {
    question: "How much of your money could be cash within 7 days?",
    options: order.map((i) => `${values[i]}%`),
    answerIndex: order.indexOf(0),
  };
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
