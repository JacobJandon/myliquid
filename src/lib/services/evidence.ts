import { nowIso, type Db } from "@/lib/db";
import {
  GENESIS,
  linkHash,
  verifyChain,
  type ChainVerdict,
  type EvidenceEntry,
} from "@/lib/domain/evidence";

/**
 * Sealing the Activity log into a hash chain (`lib/domain/evidence.ts`). Entries are written as before, in one
 * statement each; sealing links the new ones, in id order, inside one write transaction, so two servers can't fork
 * the chain. It runs when the investor opens Activity or downloads evidence, and daily for everyone (the cron).
 */

export function evidenceKey(): string | null {
  const k = process.env.MYLIQUID_EVIDENCE_KEY ?? "";
  return k.length >= 16 ? k : null;
}

interface Row {
  id: number;
  investor_id: string;
  run_id: string | null;
  agent: string;
  kind: string;
  title: string;
  payload: string | null;
  sim_date: string;
  created_at: string;
  prev_hash: string | null;
  hash: string | null;
}

const entry = (r: Row): EvidenceEntry => ({
  id: r.id,
  investorId: r.investor_id,
  runId: r.run_id,
  agent: r.agent,
  kind: r.kind,
  title: r.title,
  payload: r.payload,
  simDate: r.sim_date,
  createdAt: r.created_at,
});

const BATCH = 100;

/** Links this investor's unsealed entries onto the chain. Returns how many were sealed. */
export function sealActivity(db: Db, investorId: string): number {
  const key = evidenceKey();
  return db.transaction(() => {
    const last = db
      .prepare(
        "SELECT hash FROM agent_events WHERE investor_id = ? AND hash IS NOT NULL ORDER BY id DESC LIMIT 1",
      )
      .get(investorId) as { hash: string } | undefined;
    const rows = db
      .prepare(
        "SELECT * FROM agent_events WHERE investor_id = ? AND hash IS NULL ORDER BY id LIMIT 5000",
      )
      .all(investorId) as Row[];
    let prev = last?.hash ?? GENESIS;
    const links: [number, string, string][] = [];
    for (const r of rows) {
      const hash = linkHash(prev, entry(r), key);
      links.push([r.id, prev, hash]);
      prev = hash;
    }
    for (let i = 0; i < links.length; i += BATCH) {
      const part = links.slice(i, i + BATCH);
      const cases = part.map(() => "WHEN ? THEN ?").join(" ");
      db.prepare(
        `UPDATE agent_events SET prev_hash = CASE id ${cases} END, hash = CASE id ${cases} END
         WHERE investor_id = ? AND hash IS NULL AND id IN (${part.map(() => "?").join(", ")})`,
      ).run(
        ...part.flatMap(([id, p]) => [id, p]),
        ...part.flatMap(([id, , h]) => [id, h]),
        investorId,
        ...part.map(([id]) => id),
      );
    }
    return links.length;
  })();
}

/** Seals every investor's new entries (the daily job). */
export function sealAllActivity(db: Db): number {
  const ids = db
    .prepare("SELECT DISTINCT investor_id FROM agent_events WHERE hash IS NULL LIMIT 10000")
    .all() as { investor_id: string }[];
  return ids.reduce((n, { investor_id }) => n + sealActivity(db, investor_id), 0);
}

function sealedRows(db: Db, investorId: string): Row[] {
  return db
    .prepare(
      "SELECT * FROM agent_events WHERE investor_id = ? AND hash IS NOT NULL ORDER BY id LIMIT 100000",
    )
    .all(investorId) as Row[];
}

export interface EvidenceStatus {
  verdict: ChainVerdict;
  keyed: boolean;
  firstAt: string | null;
  lastAt: string | null;
}

/** Seals what's new, then re-derives the whole chain and says whether it holds. */
export function evidenceStatus(db: Db, investorId: string): EvidenceStatus {
  sealActivity(db, investorId);
  const rows = sealedRows(db, investorId);
  const key = evidenceKey();
  return {
    verdict: verifyChain(
      rows.map((r) => ({ ...entry(r), prevHash: r.prev_hash!, hash: r.hash! })),
      key,
    ),
    keyed: !!key,
    firstAt: rows[0]?.created_at ?? null,
    lastAt: rows.at(-1)?.created_at ?? null,
  };
}

/** The investor's whole sealed log, with every link, for their records or an auditor. */
export function exportEvidence(db: Db, investorId: string) {
  const status = evidenceStatus(db, investorId);
  const rows = sealedRows(db, investorId);
  return {
    format: "myliquid-evidence-v1",
    generatedAt: nowIso(),
    investorId,
    keyed: status.keyed,
    hashing: status.keyed
      ? "HMAC-SHA256 with MyLiquid's evidence key over 'myliquid-evidence-v1\\n' + prev + '\\n' + canonical entry"
      : "SHA-256 over 'myliquid-evidence-v1\\n' + prev + '\\n' + canonical entry",
    canonicalEntry:
      "JSON array: [id, investorId, runId, agent, kind, title, payload, simDate, createdAt]",
    genesis: GENESIS,
    verdict: status.verdict,
    entries: rows.map((r) => ({ ...entry(r), prevHash: r.prev_hash, hash: r.hash })),
  };
}
