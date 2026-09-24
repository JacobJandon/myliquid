import { newId, nowIso, simDate, type Db } from "@/lib/db";
import type { Severity } from "@/lib/domain/types";
import { logEvent } from "./audit";

export interface Alert {
  id: string;
  agent: string;
  severity: Severity;
  code: string;
  title: string;
  detail: string;
  productId: string | null;
  createdOn: string;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * Raises an alert, or refreshes an open one with the same code and product so a
 * recurring check doesn't flood the inbox.
 */
export function raiseAlert(
  db: Db,
  investorId: string,
  a: {
    agent: string;
    severity: Severity;
    code: string;
    title: string;
    detail: string;
    productId?: string | null;
    runId?: string | null;
  },
): Alert {
  const existing = db
    .prepare(
      "SELECT id FROM alerts WHERE investor_id = ? AND code = ? AND COALESCE(product_id, '') = COALESCE(?, '') AND resolved_at IS NULL",
    )
    .get(investorId, a.code, a.productId ?? null) as { id: string } | undefined;
  const today = simDate(db);
  if (existing) {
    db.prepare(
      "UPDATE alerts SET severity = ?, title = ?, detail = ?, created_on = ?, agent = ? WHERE id = ?",
    ).run(a.severity, a.title, a.detail, today, a.agent, existing.id);
    return getAlert(db, investorId, existing.id)!;
  }
  const id = newId("alt");
  db.prepare(
    `INSERT INTO alerts (id, investor_id, agent, severity, code, title, detail, product_id, created_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    investorId,
    a.agent,
    a.severity,
    a.code,
    a.title,
    a.detail,
    a.productId ?? null,
    today,
    nowIso(),
  );
  logEvent(db, investorId, {
    runId: a.runId,
    agent: a.agent,
    kind: "alert",
    title: `${a.severity.toUpperCase()}: ${a.title}`,
    payload: { detail: a.detail },
  });
  return getAlert(db, investorId, id)!;
}

/** Resolves open alerts from `agent` whose code is no longer reported. */
export function resolveMissing(
  db: Db,
  investorId: string,
  agent: string,
  stillOpen: { code: string; productId?: string | null }[],
): void {
  for (const alert of listAlerts(db, investorId, { openOnly: true }).filter(
    (a) => a.agent === agent,
  )) {
    const open = stillOpen.some(
      (c) => c.code === alert.code && (c.productId ?? null) === alert.productId,
    );
    if (!open) resolveAlert(db, investorId, alert.id);
  }
}

export function resolveAlert(db: Db, investorId: string, id: string): void {
  db.prepare(
    "UPDATE alerts SET resolved_at = ? WHERE id = ? AND investor_id = ? AND resolved_at IS NULL",
  ).run(nowIso(), id, investorId);
}

function mapAlert(r: Record<string, unknown>): Alert {
  return {
    id: r.id as string,
    agent: r.agent as string,
    severity: r.severity as Severity,
    code: r.code as string,
    title: r.title as string,
    detail: r.detail as string,
    productId: (r.product_id as string | null) ?? null,
    createdOn: r.created_on as string,
    createdAt: r.created_at as string,
    resolvedAt: (r.resolved_at as string | null) ?? null,
  };
}

export function getAlert(db: Db, investorId: string, id: string): Alert | undefined {
  const row = db
    .prepare("SELECT * FROM alerts WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapAlert(row) : undefined;
}

const SEVERITY_ORDER = "CASE severity WHEN 'critical' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END";

export function listAlerts(
  db: Db,
  investorId: string,
  opts: { openOnly?: boolean; limit?: number } = {},
): Alert[] {
  const rows = db
    .prepare(
      `SELECT * FROM alerts WHERE investor_id = ? ${opts.openOnly ? "AND resolved_at IS NULL" : ""}
       ORDER BY resolved_at IS NOT NULL, ${SEVERITY_ORDER}, created_at DESC LIMIT ?`,
    )
    .all(investorId, opts.limit ?? 100) as Record<string, unknown>[];
  return rows.map(mapAlert);
}
