import { nowIso, type Db } from "@/lib/db";
import {
  XP_RULES,
  QUESTS,
  checkinBonus,
  computeVitals,
  currentEnergy,
  currentFullness,
  currentJoy,
  isPetColor,
  levelForXp,
  levelProgress,
  liquidityQuiz,
  petThought,
  questsForDay,
  stageForLevel,
  streakAfterCheckin,
  type CompanionRecord,
  type PetColor,
  type PortfolioSignals,
  type QuestId,
  type Quiz,
  type Vitals,
  type XpAction,
} from "@/lib/domain/companion";
import { formatUsd } from "@/lib/domain/money";
import { getMerchant } from "@/lib/domain/payments";
import { listAlerts, resolveAlert } from "./alerts";
import { logEvent } from "./audit";
import { getLadder, getSnapshot } from "./portfolio";
import { listProposals } from "./proposals";
import { getMandate, updateMandate } from "./repo";

/** The investor's living agent: state, vitals, XP, quests and the actions that care for it. */

export const DEFAULT_PET_NAME = "Drip";

interface CompanionRow {
  name: string;
  color: string;
  born_at: string;
  xp: number;
  fullness: number;
  fullness_at: string;
  energy: number;
  energy_at: string;
  joy: number;
  joy_at: string;
  streak: number;
  last_checkin_day: string | null;
  last_level: number;
}

function mapRow(r: CompanionRow): CompanionRecord {
  return {
    name: r.name,
    color: isPetColor(r.color) ? r.color : "blue",
    bornAt: r.born_at,
    xp: r.xp,
    fullness: r.fullness,
    fullnessAt: r.fullness_at,
    energy: r.energy,
    energyAt: r.energy_at,
    joy: r.joy,
    joyAt: r.joy_at,
    streak: r.streak,
    lastCheckinDay: r.last_checkin_day,
    lastLevel: r.last_level,
  };
}

/** Wall-clock day (UTC). Pets live in real time, unlike the simulated market. */
export function realDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function createCompanion(
  db: Db,
  investorId: string,
  opts: { name?: string; color?: PetColor } = {},
): void {
  const now = nowIso();
  db.prepare(
    `INSERT OR IGNORE INTO companions (investor_id, name, color, born_at, xp, fullness, fullness_at, energy, energy_at, joy, joy_at, streak, last_checkin_day, last_level)
     VALUES (?, ?, ?, ?, 0, 70, ?, 90, ?, 60, ?, 0, NULL, 1)`,
  ).run(investorId, cleanName(opts.name), opts.color ?? "blue", now, now, now, now);
}

export function cleanName(name: string | undefined): string {
  const n = (name ?? "")
    .replace(/[^\p{L}\p{N} '\-]/gu, "")
    .trim()
    .slice(0, 20);
  return n || DEFAULT_PET_NAME;
}

export function getCompanionRecord(db: Db, investorId: string): CompanionRecord {
  let row = db.prepare("SELECT * FROM companions WHERE investor_id = ?").get(investorId) as
    CompanionRow | undefined;
  if (!row) {
    createCompanion(db, investorId);
    row = db
      .prepare("SELECT * FROM companions WHERE investor_id = ?")
      .get(investorId) as CompanionRow;
  }
  return mapRow(row);
}

function saveVitals(
  db: Db,
  investorId: string,
  v: { fullness?: number; energy?: number; joy?: number },
): void {
  const now = nowIso();
  if (v.fullness !== undefined)
    db.prepare("UPDATE companions SET fullness = ?, fullness_at = ? WHERE investor_id = ?").run(
      v.fullness,
      now,
      investorId,
    );
  if (v.energy !== undefined)
    db.prepare("UPDATE companions SET energy = ?, energy_at = ? WHERE investor_id = ?").run(
      v.energy,
      now,
      investorId,
    );
  if (v.joy !== undefined)
    db.prepare("UPDATE companions SET joy = ?, joy_at = ? WHERE investor_id = ?").run(
      v.joy,
      now,
      investorId,
    );
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Nudges vitals relative to their current (decayed) values. */
export function adjustVitals(
  db: Db,
  investorId: string,
  delta: { fullness?: number; energy?: number; joy?: number },
): void {
  const c = getCompanionRecord(db, investorId);
  const now = new Date();
  const sleeping = getMandate(db, investorId).killSwitch;
  saveVitals(db, investorId, {
    fullness:
      delta.fullness !== undefined ? clamp(currentFullness(c, now) + delta.fullness) : undefined,
    energy:
      delta.energy !== undefined
        ? clamp(currentEnergy(c, now, sleeping) + delta.energy)
        : undefined,
    joy: delta.joy !== undefined ? clamp(currentJoy(c, now) + delta.joy) : undefined,
  });
}

// ── XP ──────────────────────────────────────────────────────────────────────

function countToday(
  db: Db,
  investorId: string,
  action: string,
  day: string,
  note?: string,
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM companion_log WHERE investor_id = ? AND day = ? AND action = ? ${note ? "AND note = ?" : ""}`,
    )
    .get(...[investorId, day, action, ...(note ? [note] : [])]) as { n: number };
  return row.n;
}

export interface XpResult {
  awarded: number;
  levelUp: { level: number; stage: string; evolved: boolean } | null;
  questsCompleted: string[];
}

/** Awards XP for a habit, respecting daily caps, then checks quests and level-ups. */
export function awardXp(
  db: Db,
  investorId: string,
  action: XpAction,
  opts: { bonus?: number; note?: string } = {},
): XpResult {
  const day = realDay();
  const rule = XP_RULES[action];
  const result: XpResult = { awarded: 0, levelUp: null, questsCompleted: [] };
  if (countToday(db, investorId, action, day) >= rule.dailyCap) return result;
  const xp = rule.xp + (opts.bonus ?? 0);
  db.prepare(
    "INSERT INTO companion_log (investor_id, action, xp, note, day, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(investorId, action, xp, opts.note ?? null, day, nowIso());
  db.prepare("UPDATE companions SET xp = xp + ? WHERE investor_id = ?").run(xp, investorId);
  result.awarded = xp;

  // Quests completed by this action
  if (action !== "quest") {
    for (const q of questsForDay(investorId, day)) {
      if (QUESTS[q].completedBy === action && countToday(db, investorId, "quest", day, q) === 0) {
        const r = awardXp(db, investorId, "quest", { note: q });
        result.awarded += r.awarded;
        result.questsCompleted.push(q);
      }
    }
  }

  // Level up / evolution
  const c = getCompanionRecord(db, investorId);
  const level = levelForXp(c.xp);
  if (level > c.lastLevel) {
    const before = stageForLevel(c.lastLevel);
    const after = stageForLevel(level);
    db.prepare("UPDATE companions SET last_level = ? WHERE investor_id = ?").run(level, investorId);
    const evolved = before.id !== after.id;
    result.levelUp = { level, stage: after.name, evolved };
    logEvent(db, investorId, {
      agent: "copilot",
      kind: "system",
      title: evolved
        ? `${c.name} evolved into a ${after.name}! (level ${level})`
        : `${c.name} reached level ${level}`,
    });
  }
  return result;
}

// ── View ────────────────────────────────────────────────────────────────────

export function portfolioSignals(db: Db, investorId: string): PortfolioSignals {
  const alerts = listAlerts(db, investorId, { openOnly: true });
  const snapshot = getSnapshot(db, investorId);
  const ladder = getLadder(db, investorId, snapshot);
  const mandate = getMandate(db, investorId);
  const wallet = db
    .prepare("SELECT balance_cents FROM wallets WHERE investor_id = ?")
    .get(investorId) as { balance_cents: number } | undefined;
  const pendingPayments = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM payments WHERE investor_id = ? AND status = 'pending_approval'",
      )
      .get(investorId) as { n: number }
  ).n;
  const last = db
    .prepare(
      "SELECT merchant_id, amount_cents, created_at FROM payments WHERE investor_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
    )
    .get(investorId) as
    { merchant_id: string; amount_cents: number; created_at: string } | undefined;
  const critical = alerts.filter((a) => a.severity === "critical");
  return {
    criticalAlerts: critical.length,
    warnAlerts: alerts.filter((a) => a.severity === "warn").length,
    topAlertTitle: (critical[0] ?? alerts[0])?.title ?? null,
    pendingProposals: listProposals(db, investorId, { status: "pending" }).length,
    pendingPayments,
    liquidWeekPct: ladder.find((b) => b.id === "week")?.cumulativePct ?? 0,
    killSwitch: mandate.killSwitch,
    circuitBreaker: mandate.killSwitch && (mandate.killReason ?? "").startsWith("Circuit breaker"),
    holdings: snapshot.holdings.length,
    walletCents: wallet?.balance_cents ?? 0,
    lastPayment: last
      ? {
          merchant: getMerchant(last.merchant_id)?.name ?? last.merchant_id,
          amountCents: last.amount_cents,
          hoursAgo: (Date.now() - new Date(last.created_at).getTime()) / 3_600_000,
        }
      : null,
  };
}

export interface QuestView {
  id: QuestId;
  title: string;
  done: boolean;
}

export interface CompanionView {
  name: string;
  color: PetColor;
  bornAt: string;
  xp: number;
  level: number;
  levelPct: number;
  xpToNext: number;
  stage: { id: string; name: string; blurb: string };
  vitals: Vitals;
  streak: number;
  checkedInToday: boolean;
  thought: string;
  quests: QuestView[];
  xpToday: number;
}

export function getCompanionView(db: Db, investorId: string, now = new Date()): CompanionView {
  const c = getCompanionRecord(db, investorId);
  const signals = portfolioSignals(db, investorId);
  const vitals = computeVitals(c, signals, now);
  const day = realDay(now);
  const quests: QuestView[] = questsForDay(investorId, day).map((id) => ({
    id,
    title: QUESTS[id].title(c.name),
    done: countToday(db, investorId, "quest", day, id) > 0,
  }));
  const progress = levelProgress(c.xp);
  const stage = stageForLevel(progress.level);
  const xpToday = (
    db
      .prepare(
        "SELECT COALESCE(SUM(xp), 0) AS xp FROM companion_log WHERE investor_id = ? AND day = ?",
      )
      .get(investorId, day) as { xp: number }
  ).xp;
  return {
    name: c.name,
    color: c.color,
    bornAt: c.bornAt,
    xp: c.xp,
    level: progress.level,
    levelPct: progress.pct,
    xpToNext: progress.span - progress.into,
    stage: { id: stage.id, name: stage.name, blurb: stage.blurb },
    vitals,
    streak: c.streak,
    checkedInToday: c.lastCheckinDay === day,
    thought: petThought({
      name: c.name,
      vitals,
      signals,
      streak: c.streak,
      openQuest: quests.find((q) => !q.done)?.title ?? null,
      hourSeed: now.getUTCHours(),
    }),
    quests,
    xpToday,
  };
}

// ── Actions ─────────────────────────────────────────────────────────────────

export interface ActionResult {
  message: string;
  xp: XpResult;
}

export function checkIn(db: Db, investorId: string): ActionResult {
  const c = getCompanionRecord(db, investorId);
  const day = realDay();
  const streak = streakAfterCheckin(c.lastCheckinDay, day, c.streak);
  if (streak === null)
    return {
      message: `${c.name} already saw you today.`,
      xp: { awarded: 0, levelUp: null, questsCompleted: [] },
    };
  db.prepare("UPDATE companions SET streak = ?, last_checkin_day = ? WHERE investor_id = ?").run(
    streak,
    day,
    investorId,
  );
  adjustVitals(db, investorId, { joy: 12 });
  const xp = awardXp(db, investorId, "checkin", { bonus: checkinBonus(streak) });
  return {
    message:
      streak > 1
        ? `${streak}-day streak! ${c.name} is glad you're back.`
        : `${c.name} is happy to see you.`,
    xp,
  };
}

/** Feeding gives the pet a "research snack": a real, useful fact about the portfolio. */
export function feed(db: Db, investorId: string): ActionResult {
  const c = getCompanionRecord(db, investorId);
  if (currentFullness(c, new Date()) >= 95) {
    return {
      message: `${c.name} is full. Try again in a few hours.`,
      xp: { awarded: 0, levelUp: null, questsCompleted: [] },
    };
  }
  adjustVitals(db, investorId, { fullness: 35, joy: 5 });
  const snapshot = getSnapshot(db, investorId);
  const facts: string[] = [];
  const top = snapshot.holdings[0];
  if (top)
    facts.push(
      `Your biggest position is ${top.product.name} at ${(top.weight * 100).toFixed(1)}% of the portfolio.`,
    );
  const locked = snapshot.holdings.filter((h) => h.lockedValueCents > 0);
  if (locked.length) {
    const next = locked
      .map((h) => h.nextUnlock)
      .filter(Boolean)
      .sort()[0];
    facts.push(
      `${locked.length} position${locked.length === 1 ? " is" : "s are"} locked. The next unlock is ${next}.`,
    );
  }
  facts.push(`You hold ${formatUsd(snapshot.cashCents)} in cash.`);
  const fact = facts[Math.floor(Date.now() / 60_000) % facts.length];
  const xp = awardXp(db, investorId, "feed");
  return { message: `Nom. Research snack digested: ${fact}`, xp };
}

export function getQuiz(db: Db, investorId: string, now = new Date()): Quiz & { seed: string } {
  const seed = `${investorId}:${now.toISOString().slice(0, 13)}`;
  const week = getLadder(db, investorId).find((b) => b.id === "week")?.cumulativePct ?? 0;
  return { ...liquidityQuiz(week, seed), seed };
}

export function play(
  db: Db,
  investorId: string,
  answerIndex: number,
  seed: string,
): ActionResult & { correct: boolean; answer: string } {
  const c = getCompanionRecord(db, investorId);
  if (!seed.startsWith(`${investorId}:`)) throw new Error("Invalid quiz");
  const week = getLadder(db, investorId).find((b) => b.id === "week")?.cumulativePct ?? 0;
  const quiz = liquidityQuiz(week, seed);
  const correct = answerIndex === quiz.answerIndex;
  const answer = quiz.options[quiz.answerIndex]!;
  adjustVitals(db, investorId, { joy: correct ? 25 : 8, energy: -8 });
  if (!correct) {
    return {
      correct,
      answer,
      message: `Close! It's ${answer}. Settlement, notice periods and lock-ups all count. The liquidity ladder shows the details.`,
      xp: { awarded: 0, levelUp: null, questsCompleted: [] },
    };
  }
  const xp = awardXp(db, investorId, "play");
  return { correct, answer, message: `Yes! ${answer}. ${c.name} does a little splash.`, xp };
}

/** Putting the pet to sleep is the kill switch: every agent and autopilot rule pauses. */
export function sleep(db: Db, investorId: string): ActionResult {
  const c = getCompanionRecord(db, investorId);
  updateMandate(db, investorId, { killSwitch: true, killReason: `You put ${c.name} to sleep` });
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `Put ${c.name} to sleep: all agents paused`,
  });
  return {
    message: `${c.name} is asleep. All agents and autopilot rules are paused.`,
    xp: { awarded: 0, levelUp: null, questsCompleted: [] },
  };
}

/** Only a human can wake the pet (release the kill switch). */
export function wake(db: Db, investorId: string): ActionResult {
  const c = getCompanionRecord(db, investorId);
  updateMandate(db, investorId, { killSwitch: false, killReason: null });
  for (const a of listAlerts(db, investorId, { openOnly: true })) {
    if (a.code === "circuit_breaker" || a.code === "agents_paused")
      resolveAlert(db, investorId, a.id);
  }
  adjustVitals(db, investorId, { joy: 5 });
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `Woke ${c.name}: agents resumed`,
  });
  return {
    message: `${c.name} is awake and back on duty.`,
    xp: { awarded: 0, levelUp: null, questsCompleted: [] },
  };
}

export function customize(
  db: Db,
  investorId: string,
  opts: { name?: string; color?: string },
): void {
  getCompanionRecord(db, investorId);
  if (opts.name !== undefined)
    db.prepare("UPDATE companions SET name = ? WHERE investor_id = ?").run(
      cleanName(opts.name),
      investorId,
    );
  if (opts.color !== undefined && isPetColor(opts.color))
    db.prepare("UPDATE companions SET color = ? WHERE investor_id = ?").run(opts.color, investorId);
}

/** Work tires the pet: agent runs, desk cycles and payments spend energy. */
export function spendEnergy(db: Db, investorId: string, amount: number): void {
  adjustVitals(db, investorId, { energy: -amount });
}

export function petName(db: Db, investorId: string): string {
  const row = db.prepare("SELECT name FROM companions WHERE investor_id = ?").get(investorId) as
    { name: string } | undefined;
  return row?.name ?? DEFAULT_PET_NAME;
}
