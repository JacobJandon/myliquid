import type { Db } from "@/lib/db";
import { buildEvidenceReport, type EvidenceFacts } from "@/lib/domain/evidenceReport";
import { evidenceStatus } from "./evidence";
import { getMandate } from "./repo";

/** The facts behind an account's evidence report, all from its own records. */
export function evidenceFacts(db: Db, investorId: string): EvidenceFacts {
  const n = (sql: string, ...args: unknown[]) =>
    Number((db.prepare(sql).get(investorId, ...args) as { n: number }).n);
  const status = evidenceStatus(db, investorId);
  const m = getMandate(db, investorId);
  const AGENT = "placed_by <> 'user'";
  return {
    period: { from: status.firstAt, to: status.lastAt },
    mandate: {
      autonomy: m.autonomy,
      killSwitch: m.killSwitch,
      perOrderCapCents: m.perOrderCapCents,
      dailyCapCents: m.dailyCapCents,
      circuitBreakerPct: m.circuitBreakerPct,
      readOnly: m.readOnly,
    },
    orders: {
      total: n("SELECT COUNT(*) AS n FROM orders WHERE investor_id = ?"),
      byAgents: n(`SELECT COUNT(*) AS n FROM orders WHERE investor_id = ? AND ${AGENT}`),
      autonomous: n("SELECT COUNT(*) AS n FROM orders WHERE investor_id = ? AND autonomous = 1"),
      blocked: n("SELECT COUNT(*) AS n FROM orders WHERE investor_id = ? AND status = 'rejected'"),
      blockedForAgents: n(
        `SELECT COUNT(*) AS n FROM orders WHERE investor_id = ? AND status = 'rejected' AND ${AGENT}`,
      ),
    },
    proposals: {
      approved: n(
        "SELECT COUNT(*) AS n FROM proposals WHERE investor_id = ? AND status IN ('executed', 'partially_executed', 'failed')",
      ),
      rejected: n(
        "SELECT COUNT(*) AS n FROM proposals WHERE investor_id = ? AND status = 'rejected'",
      ),
      pending: n(
        "SELECT COUNT(*) AS n FROM proposals WHERE investor_id = ? AND status = 'pending'",
      ),
      withdrawn: n(
        "SELECT COUNT(*) AS n FROM proposals WHERE investor_id = ? AND status = 'withdrawn'",
      ),
    },
    payments: {
      approved: n(
        "SELECT COUNT(*) AS n FROM payments WHERE investor_id = ? AND status = 'approved'",
      ),
      declined: n(
        "SELECT COUNT(*) AS n FROM payments WHERE investor_id = ? AND status = 'declined'",
      ),
      awaitingApproval: n(
        "SELECT COUNT(*) AS n FROM payments WHERE investor_id = ? AND status = 'pending_approval'",
      ),
    },
    agents: {
      runs: n("SELECT COUNT(*) AS n FROM agent_runs WHERE investor_id = ?"),
      toolCalls: n(
        "SELECT COUNT(*) AS n FROM agent_events WHERE investor_id = ? AND kind = 'tool_call'",
      ),
      outsideToolCalls: n(
        "SELECT COUNT(*) AS n FROM agent_events WHERE investor_id = ? AND kind = 'tool_call' AND agent = 'external'",
      ),
      keysActive: n(
        "SELECT COUNT(*) AS n FROM api_keys WHERE investor_id = ? AND revoked_at IS NULL",
      ),
      keysRevoked: n(
        "SELECT COUNT(*) AS n FROM api_keys WHERE investor_id = ? AND revoked_at IS NOT NULL",
      ),
      keysPinned: n("SELECT COUNT(*) AS n FROM api_key_identities WHERE investor_id = ?"),
      identities: n(
        "SELECT COUNT(DISTINCT ainra_number) AS n FROM api_key_identities WHERE investor_id = ?",
      ),
    },
    alerts: {
      critical: n(
        "SELECT COUNT(*) AS n FROM alerts WHERE investor_id = ? AND severity = 'critical'",
      ),
      passportRevoked: n(
        "SELECT COUNT(*) AS n FROM alerts WHERE investor_id = ? AND code = 'agent_passport_revoked'",
      ),
      circuitBreaker: n(
        "SELECT COUNT(*) AS n FROM alerts WHERE investor_id = ? AND code = 'circuit_breaker'",
      ),
    },
    chain: { ...status.verdict, keyed: status.keyed },
  };
}

export function evidenceReport(db: Db, investorId: string) {
  const facts = evidenceFacts(db, investorId);
  return { facts, sections: buildEvidenceReport(facts) };
}
