import { newId, nowIso, simDate, type Db } from "@/lib/db";

/** Append-only audit trail of everything agents (and people) do, per investor. */

export type EventKind =
  | "run_started"
  | "run_finished"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "message"
  | "order"
  | "proposal"
  | "alert"
  | "system"
  | "error";

export interface AgentEvent {
  id: number;
  runId: string | null;
  agent: string;
  kind: EventKind;
  title: string;
  payload: unknown;
  simDate: string;
  createdAt: string;
}

export function logEvent(
  db: Db,
  investorId: string,
  event: {
    runId?: string | null;
    agent: string;
    kind: EventKind;
    title: string;
    payload?: unknown;
  },
): void {
  db.prepare(
    "INSERT INTO agent_events (investor_id, run_id, agent, kind, title, payload, sim_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    investorId,
    event.runId ?? null,
    event.agent,
    event.kind,
    event.title.slice(0, 500),
    event.payload === undefined ? null : JSON.stringify(event.payload),
    simDate(db),
    nowIso(),
  );
}

export function listEvents(
  db: Db,
  investorId: string,
  opts: { limit?: number; runId?: string; agent?: string } = {},
): AgentEvent[] {
  const where = ["investor_id = ?"];
  const params: unknown[] = [investorId];
  if (opts.runId) {
    where.push("run_id = ?");
    params.push(opts.runId);
  }
  if (opts.agent) {
    where.push("agent = ?");
    params.push(opts.agent);
  }
  const rows = db
    .prepare(`SELECT * FROM agent_events WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ?`)
    .all(...params, opts.limit ?? 100) as {
    id: number;
    run_id: string | null;
    agent: string;
    kind: EventKind;
    title: string;
    payload: string | null;
    sim_date: string;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    runId: r.run_id,
    agent: r.agent,
    kind: r.kind,
    title: r.title,
    payload: r.payload ? JSON.parse(r.payload) : null,
    simDate: r.sim_date,
    createdAt: r.created_at,
  }));
}

export interface AgentRun {
  id: string;
  agent: string;
  trigger: string;
  mode: "claude" | "offline";
  status: "running" | "completed" | "failed";
  summary: string | null;
  error: string | null;
  simDate: string;
  startedAt: string;
  finishedAt: string | null;
}

export function startRun(
  db: Db,
  investorId: string,
  agent: string,
  trigger: string,
  mode: AgentRun["mode"],
): string {
  const id = newId("run");
  db.prepare(
    "INSERT INTO agent_runs (id, investor_id, agent, trigger, mode, status, sim_date, started_at) VALUES (?, ?, ?, ?, ?, 'running', ?, ?)",
  ).run(id, investorId, agent, trigger, mode, simDate(db), nowIso());
  logEvent(db, investorId, {
    runId: id,
    agent,
    kind: "run_started",
    title: `${agent} started (${trigger}, ${mode} mode)`,
  });
  return id;
}

export function finishRun(db: Db, id: string, result: { summary?: string; error?: string }): void {
  db.prepare(
    "UPDATE agent_runs SET status = ?, summary = ?, error = ?, finished_at = ? WHERE id = ?",
  ).run(
    result.error ? "failed" : "completed",
    result.summary ?? null,
    result.error ?? null,
    nowIso(),
    id,
  );
}

export function listRuns(db: Db, investorId: string, limit = 20): AgentRun[] {
  const rows = db
    .prepare("SELECT * FROM agent_runs WHERE investor_id = ? ORDER BY started_at DESC LIMIT ?")
    .all(investorId, limit) as {
    id: string;
    agent: string;
    trigger: string;
    mode: AgentRun["mode"];
    status: AgentRun["status"];
    summary: string | null;
    error: string | null;
    sim_date: string;
    started_at: string;
    finished_at: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    agent: r.agent,
    trigger: r.trigger,
    mode: r.mode,
    status: r.status,
    summary: r.summary,
    error: r.error,
    simDate: r.sim_date,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  }));
}

export function lastRunByAgent(db: Db, investorId: string): Map<string, AgentRun> {
  const map = new Map<string, AgentRun>();
  for (const run of listRuns(db, investorId, 200)) if (!map.has(run.agent)) map.set(run.agent, run);
  return map;
}
