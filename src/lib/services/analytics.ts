import { createHash } from "node:crypto";
import { newId, nowIso, type Db } from "@/lib/db";
import {
  ACTIVATION_EVENTS,
  EXPERIMENTS,
  PMF_ANSWERS,
  compareRates,
  funnel,
  pmfScore,
  retention,
  type Comparison,
  type EventName,
  type PmfAnswer,
} from "@/lib/domain/analytics";
import { addDays, toIsoDate } from "@/lib/domain/dates";

/**
 * First-party analytics and research answers: the evidence MyLiquid iterates on (docs/discovery). Recording never
 * fails a request: a broken insert is dropped, not thrown. Reading is for the admin dashboard only, since it spans
 * every account.
 */

export interface Subject {
  visitorId?: string | null;
  investorId?: string | null;
}

export function track(
  db: Db,
  name: EventName,
  subject: Subject,
  props: Record<string, string | number | boolean | null> = {},
  opts: { dedupe?: string; now?: Date } = {},
): boolean {
  try {
    const now = opts.now ?? new Date();
    db.prepare(
      "INSERT OR IGNORE INTO events (name, visitor_id, investor_id, props, day, created_at, dedupe) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      name,
      subject.visitorId ?? null,
      subject.investorId ?? null,
      JSON.stringify(props).slice(0, 2000),
      toIsoDate(now),
      now.toISOString(),
      opts.dedupe ?? null,
    );
    return true;
  } catch {
    return false;
  }
}

/** Counts an account as active today (once per day). */
export function trackAppOpened(db: Db, investorId: string, visitorId: string | null): void {
  const day = toIsoDate(new Date());
  track(
    db,
    "app_opened",
    { investorId, visitorId },
    {},
    { dedupe: `app_opened:${investorId}:${day}` },
  );
}

export type ResearchKind = "pmf" | "waitlist" | "design_partner" | "ainra_interest";

export function recordResponse(
  db: Db,
  kind: ResearchKind,
  subject: Subject,
  answers: Record<string, unknown>,
  email: string | null = null,
): string {
  const id = newId("res");
  db.prepare(
    "INSERT INTO research_responses (id, kind, visitor_id, investor_id, answers, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    kind,
    subject.visitorId ?? null,
    subject.investorId ?? null,
    JSON.stringify(answers).slice(0, 8000),
    email,
    nowIso(),
  );
  return id;
}

/** Whether this investor already answered (or dismissed) a survey. */
export function hasResponded(db: Db, investorId: string, kind: ResearchKind): boolean {
  return !!db
    .prepare("SELECT 1 FROM research_responses WHERE investor_id = ? AND kind = ? LIMIT 1")
    .get(investorId, kind);
}

/** Days this investor opened the app. */
export function activeDays(db: Db, investorId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(DISTINCT day) AS n FROM events WHERE investor_id = ? AND name = 'app_opened'",
    )
    .get(investorId) as { n: number };
  return Number(row.n);
}

/**
 * When an account goes away, its analytics stay only as anonymous numbers: the investor id becomes a one-way
 * hash, research emails are erased, and, when the person asked (deleting their account), the device id too.
 */
export function forgetInvestorAnalytics(
  db: Db,
  investorId: string,
  opts: { forgetVisitor?: boolean } = {},
): void {
  const anon = `anon_${createHash("sha256").update(`myliquid:${investorId}`).digest("hex").slice(0, 16)}`;
  const visitor = opts.forgetVisitor ? ", visitor_id = NULL" : "";
  db.prepare(`UPDATE events SET investor_id = ?${visitor} WHERE investor_id = ?`).run(
    anon,
    investorId,
  );
  db.prepare(
    `UPDATE research_responses SET investor_id = ?, email = NULL${visitor} WHERE investor_id = ?`,
  ).run(anon, investorId);
}

/** Drops raw events older than `days` (default about 13 months). */
export function pruneEvents(db: Db, days = 400): void {
  db.prepare("DELETE FROM events WHERE day < ?").run(addDays(toIsoDate(new Date()), -days));
}

// ── The dashboard ────────────────────────────────────────────────────────────

interface EventRow {
  name: EventName;
  visitor_id: string | null;
  investor_id: string | null;
  props: string;
  day: string;
}

const parse = (json: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

export interface Metrics {
  since: string;
  today: string;
  totals: { name: EventName; count: number; subjects: number }[];
  funnel: { step: string; count: number }[];
  retention: { day: number; cohort: number; retained: number; rate: number }[];
  pmf: ReturnType<typeof pmfScore> & { benefits: string[]; improvements: string[] };
  experiments: {
    id: string;
    hypothesis: string;
    goal: EventName;
    variants: { variant: string; exposed: number; converted: number }[];
    comparison: Comparison | null;
  }[];
  research: { kind: ResearchKind; count: number }[];
  segments: { segment: string; count: number }[];
  leads: {
    kind: ResearchKind;
    email: string | null;
    answers: Record<string, unknown>;
    createdAt: string;
  }[];
  ainra: {
    inspections: { tamper: string; verdict: string; count: number }[];
    gate: { decision: string; verified: boolean; count: number }[];
    connected: { tier: string; count: number }[];
  };
}

function tally<K extends string>(keys: K[]): { key: K; count: number }[] {
  const m = new Map<K, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/** Everything the admin dashboard shows, from the last `days` of events. */
export function metrics(db: Db, opts: { days?: number; today?: string } = {}): Metrics {
  const today = opts.today ?? toIsoDate(new Date());
  const since = addDays(today, -(opts.days ?? 90));
  const rows = db
    .prepare(
      "SELECT name, visitor_id, investor_id, props, day FROM events WHERE day >= ? ORDER BY id LIMIT 250000",
    )
    .all(since) as EventRow[];

  // One subject per person where we can tell: accounts opened from a device are joined to that device.
  const deviceOf = new Map<string, string>();
  for (const r of rows)
    if (r.investor_id && r.visitor_id && !deviceOf.has(r.investor_id))
      deviceOf.set(r.investor_id, r.visitor_id);
  const subjectOf = (r: EventRow) =>
    (r.investor_id && deviceOf.get(r.investor_id)) || r.visitor_id || r.investor_id;

  const reached = new Map<string, Set<string>>();
  const byName = new Map<EventName, { count: number; subjects: Set<string> }>();
  const days = new Map<string, Set<string>>();
  for (const r of rows) {
    const s = subjectOf(r);
    const n = byName.get(r.name) ?? { count: 0, subjects: new Set<string>() };
    n.count += 1;
    if (s) n.subjects.add(s);
    byName.set(r.name, n);
    if (!s) continue;
    if (!reached.has(s)) reached.set(s, new Set());
    reached.get(s)!.add(r.name);
    if (r.investor_id && r.name === "app_opened") {
      if (!days.has(r.investor_id)) days.set(r.investor_id, new Set());
      days.get(r.investor_id)!.add(r.day);
    }
  }

  const steps: [string, string[]][] = [
    ["Saw the front page", ["landing_viewed"]],
    ["Tried it (guest or account)", ["guest_started", "signed_up"]],
    ["Activated (traded, decided, hired or connected an agent)", ACTIVATION_EVENTS],
    ["Saved an account", ["signed_up"]],
  ];
  const counts = funnel(
    steps.map(([, names]) => names),
    reached,
  );

  const dayLists = new Map([...days].map(([k, v]) => [k, [...v]]));
  const experiments = Object.values(EXPERIMENTS).map((e) => {
    const exposedBy = new Map<string, Set<string>>();
    for (const r of rows) {
      if (r.name !== "landing_viewed" || !r.visitor_id) continue;
      const v = parse(r.props)[e.id];
      if (typeof v !== "string" || !(e.variants as readonly string[]).includes(v)) continue;
      // A visitor counts once, in the first variant they saw.
      if ([...exposedBy.values()].some((set) => set.has(r.visitor_id!))) continue;
      if (!exposedBy.has(v)) exposedBy.set(v, new Set());
      exposedBy.get(v)!.add(r.visitor_id);
    }
    const variants = e.variants.map((variant) => {
      const exposed = exposedBy.get(variant) ?? new Set<string>();
      const converted = [...exposed].filter((v) => reached.get(v)?.has(e.goal)).length;
      return { variant, exposed: exposed.size, converted };
    });
    const [a, b] = variants;
    return {
      id: e.id,
      hypothesis: e.hypothesis,
      goal: e.goal as EventName,
      variants,
      comparison: a && b ? compareRates(a.converted, a.exposed, b.converted, b.exposed) : null,
    };
  });

  const responses = db
    .prepare(
      "SELECT kind, answers, email, created_at FROM research_responses ORDER BY created_at DESC LIMIT 5000",
    )
    .all() as { kind: ResearchKind; answers: string; email: string | null; created_at: string }[];
  const pmfRows = responses.filter((r) => r.kind === "pmf").map((r) => parse(r.answers));
  const pmfAnswers = pmfRows
    .map((a) => a.answer)
    .filter((a): a is PmfAnswer => (PMF_ANSWERS as readonly unknown[]).includes(a));
  const text = (key: string) =>
    pmfRows
      .map((a) => a[key])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .slice(0, 50);

  const props = (name: EventName) => rows.filter((r) => r.name === name).map((r) => parse(r.props));

  return {
    since,
    today,
    totals: [...byName]
      .map(([name, v]) => ({ name, count: v.count, subjects: v.subjects.size }))
      .sort((a, b) => b.count - a.count),
    funnel: steps.map(([step], i) => ({ step, count: counts[i] ?? 0 })),
    retention: [1, 7, 30].map((d) => ({ day: d, ...retention(dayLists, d, today) })),
    pmf: { ...pmfScore(pmfAnswers), benefits: text("benefit"), improvements: text("improve") },
    experiments,
    research: tally(responses.map((r) => r.kind)).map(({ key, count }) => ({ kind: key, count })),
    segments: tally(
      responses
        .filter((r) => r.kind === "waitlist")
        .map((r) => String(parse(r.answers).segment ?? "unknown")),
    ).map(({ key, count }) => ({ segment: key, count })),
    leads: responses
      .filter((r) => r.kind !== "pmf")
      .slice(0, 200)
      .map((r) => ({
        kind: r.kind,
        email: r.email,
        answers: parse(r.answers),
        createdAt: r.created_at,
      })),
    ainra: {
      inspections: tally(
        props("ainra_inspected").map((p) => `${p.tamper ?? "none"}|${p.verdict ?? "?"}`),
      ).map(({ key, count }) => {
        const [tamper, verdict] = key.split("|");
        return { tamper: tamper!, verdict: verdict!, count };
      }),
      gate: tally(
        props("gate_decided").map((p) => `${p.decision ?? "?"}|${p.verified ? "1" : "0"}`),
      ).map(({ key, count }) => {
        const [decision, verified] = key.split("|");
        return { decision: decision!, verified: verified === "1", count };
      }),
      connected: tally(props("agent_connected").map((p) => String(p.tier ?? "?"))).map(
        ({ key, count }) => ({ tier: key, count }),
      ),
    },
  };
}
