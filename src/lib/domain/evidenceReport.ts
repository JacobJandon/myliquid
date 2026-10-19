import type { ChainVerdict } from "./evidence";

/**
 * The evidence report (pure): one account's controls and what they did, under the headings supervisors use.
 * MAS SAFR (Safeguards for Agentic Finance at Runtime, July 2026) names four safeguard classes: policy-bound
 * execution, real-time validation before execution, auditability, interoperability. FINRA's 2026 oversight report
 * expects firms to track agent actions, restrict their access, cover them in supervision and in books and records.
 * Every number comes from the account's own records (`EvidenceFacts`); nothing here is a claim the data can't back.
 * It is a record of controls, not legal advice or a compliance opinion.
 */

export interface EvidenceFacts {
  period: { from: string | null; to: string | null };
  mandate: {
    autonomy: string;
    killSwitch: boolean;
    perOrderCapCents: number;
    dailyCapCents: number;
    circuitBreakerPct: number;
    readOnly: boolean;
  };
  orders: {
    total: number;
    byAgents: number;
    autonomous: number;
    blocked: number;
    blockedForAgents: number;
  };
  proposals: { approved: number; rejected: number; pending: number; withdrawn: number };
  payments: { approved: number; declined: number; awaitingApproval: number };
  agents: {
    runs: number;
    toolCalls: number;
    outsideToolCalls: number;
    keysActive: number;
    keysRevoked: number;
    keysPinned: number;
    identities: number;
  };
  alerts: { critical: number; passportRevoked: number; circuitBreaker: number };
  chain: ChainVerdict & { keyed: boolean };
}

export type ItemValue = { count: number } | { cents: number } | { text: string } | { pct: number };

export interface ReportItem {
  label: string;
  value: ItemValue;
  /** Where it comes from in MyLiquid. */
  source: string;
}

export interface ReportSection {
  id: string;
  framework: "SAFR" | "FINRA";
  title: string;
  /** What the framework asks for, in a sentence. */
  asks: string;
  items: ReportItem[];
}

export function buildEvidenceReport(f: EvidenceFacts): ReportSection[] {
  const chain: ReportItem = {
    label: f.chain.ok
      ? `Activity log intact (${f.chain.keyed ? "HMAC-SHA256" : "SHA-256"} hash chain)`
      : "Activity log changed after it was sealed",
    value: f.chain.ok
      ? { text: `${f.chain.entries} entries, head ${f.chain.head.slice(0, 16)}…` }
      : { text: `breaks at entry ${f.chain.brokenAt} (${f.chain.reason.replace("_", " ")})` },
    source: "lib/domain/evidence.ts · GET /api/evidence",
  };
  return [
    {
      id: "safr-policy",
      framework: "SAFR",
      title: "Policy-bound execution",
      asks: "Agents act only inside limits the customer and firm set, enforced at runtime.",
      items: [
        {
          label: "Autonomy",
          value: { text: f.mandate.readOnly ? "read only" : f.mandate.autonomy },
          source: "Guardrails (mandate)",
        },
        {
          label: "Per-order cap",
          value: { cents: f.mandate.perOrderCapCents },
          source: "Mandate, enforced by Sentinel",
        },
        {
          label: "Daily cap",
          value: { cents: f.mandate.dailyCapCents },
          source: "Mandate, enforced by Sentinel",
        },
        {
          label: "Circuit breaker (one-day fall)",
          value: { pct: f.mandate.circuitBreakerPct },
          source: "Market clock",
        },
        {
          label: "Kill switch",
          value: { text: f.mandate.killSwitch ? "on: every agent stopped" : "off (ready)" },
          source: "Guardrails",
        },
        {
          label: "Agent orders placed on their own, within limits",
          value: { count: f.orders.autonomous },
          source: "orders.autonomous",
        },
      ],
    },
    {
      id: "safr-validation",
      framework: "SAFR",
      title: "Real-time validation before execution",
      asks: "Every action is checked before it executes; anything outside policy is stopped or escalated.",
      items: [
        {
          label: "Orders checked before execution",
          value: { count: f.orders.total },
          source: "executeOrder pre-trade checks",
        },
        {
          label: "Orders blocked by the checks",
          value: { count: f.orders.blocked },
          source: "orders with status rejected",
        },
        {
          label: "…of them, by agents",
          value: { count: f.orders.blockedForAgents },
          source: "orders placed by an agent",
        },
        {
          label: "Agent payments declined by policy",
          value: { count: f.payments.declined },
          source: "evaluatePayment",
        },
        {
          label: "Agent payments held for the customer's OK",
          value: { count: f.payments.awaitingApproval },
          source: "Agent Pay approvals",
        },
      ],
    },
    {
      id: "safr-audit",
      framework: "SAFR",
      title: "Auditability",
      asks: "Every agent decision and action can be reconstructed and shown not to have been altered.",
      items: [
        chain,
        { label: "Agent runs recorded", value: { count: f.agents.runs }, source: "agent_runs" },
        {
          label: "Tool calls recorded",
          value: { count: f.agents.toolCalls },
          source: "agent_events (tool_call)",
        },
      ],
    },
    {
      id: "safr-interop",
      framework: "SAFR",
      title: "Interoperability",
      asks: "Outside agents connect through open interfaces and identify themselves in a standard way.",
      items: [
        {
          label: "Tool calls from outside agents over MCP",
          value: { count: f.agents.outsideToolCalls },
          source: "/api/mcp",
        },
        {
          label: "Agent keys pinned to an AINRA identity",
          value: { count: f.agents.keysPinned },
          source: "api_key_identities",
        },
        {
          label: "Distinct AINRA identities",
          value: { count: f.agents.identities },
          source: "checkPassport (fail closed)",
        },
      ],
    },
    {
      id: "finra-track",
      framework: "FINRA",
      title: "Track agent actions",
      asks: "Know what each agent did, when, and under which identity.",
      items: [
        {
          label: "Orders placed by agents",
          value: { count: f.orders.byAgents },
          source: "orders.placed_by, stamped with key and AINRA Number",
        },
        {
          label: "Proposals agents made",
          value: {
            count:
              f.proposals.approved +
              f.proposals.rejected +
              f.proposals.pending +
              f.proposals.withdrawn,
          },
          source: "proposals",
        },
      ],
    },
    {
      id: "finra-access",
      framework: "FINRA",
      title: "Restrict access",
      asks: "Agents get only the access they need, and it can be withdrawn.",
      items: [
        {
          label: "Active agent keys",
          value: { count: f.agents.keysActive },
          source: "scoped API keys (read / trade / pay)",
        },
        { label: "Revoked agent keys", value: { count: f.agents.keysRevoked }, source: "Connect" },
        {
          label: "Agents cut off because their passport was revoked",
          value: { count: f.alerts.passportRevoked },
          source: "identityGate",
        },
      ],
    },
    {
      id: "finra-supervision",
      framework: "FINRA",
      title: "Supervision",
      asks: "A person reviews what agents may not do alone, and can stop them.",
      items: [
        {
          label: "Proposals the customer approved",
          value: { count: f.proposals.approved },
          source: "approval inbox",
        },
        {
          label: "Proposals the customer rejected",
          value: { count: f.proposals.rejected },
          source: "approval inbox",
        },
        {
          label: "Proposals waiting",
          value: { count: f.proposals.pending },
          source: "approval inbox",
        },
        {
          label: "Critical alerts raised",
          value: { count: f.alerts.critical },
          source: "Sentinel",
        },
        {
          label: "Circuit breaker trips",
          value: { count: f.alerts.circuitBreaker },
          source: "market clock",
        },
      ],
    },
    {
      id: "finra-records",
      framework: "FINRA",
      title: "Books and records",
      asks: "Records are complete, kept, and can be produced.",
      items: [
        chain,
        {
          label: "Statement (CSV) and evidence (JSON) exports",
          value: { text: "available on demand" },
          source: "/api/statements · /api/evidence",
        },
      ],
    },
  ];
}
