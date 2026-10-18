import { createHash, createHmac } from "node:crypto";

/**
 * The Activity log as evidence (pure). Every entry is linked to the one before it by a hash over its contents
 * and the previous hash, so editing, inserting or deleting an entry anywhere breaks every link after it. With a
 * server-held key (`MYLIQUID_EVIDENCE_KEY`) the links are HMACs, so someone with only database access can't
 * recompute the chain to hide a change. The latest hash (the head) is what an investor or auditor keeps: a later
 * chain that no longer reaches it shows history was rewritten or cut.
 */

export interface EvidenceEntry {
  id: number;
  investorId: string;
  runId: string | null;
  agent: string;
  kind: string;
  title: string;
  payload: string | null;
  simDate: string;
  createdAt: string;
}

/** The exact bytes an entry is hashed over: every field, in a fixed order. */
export function canonicalEntry(e: EvidenceEntry): string {
  return JSON.stringify([
    e.id,
    e.investorId,
    e.runId,
    e.agent,
    e.kind,
    e.title,
    e.payload,
    e.simDate,
    e.createdAt,
  ]);
}

/** The genesis link every investor's chain starts from. */
export const GENESIS = "0".repeat(64);

export function linkHash(prev: string, e: EvidenceEntry, key: string | null): string {
  const data = `myliquid-evidence-v1\n${prev}\n${canonicalEntry(e)}`;
  return key
    ? createHmac("sha256", key).update(data).digest("hex")
    : createHash("sha256").update(data).digest("hex");
}

export type ChainVerdict =
  | { ok: true; entries: number; head: string }
  | {
      ok: false;
      entries: number;
      /** The first entry whose link doesn't hold. */
      brokenAt: number;
      reason: "content_changed" | "link_broken";
    };

/**
 * Re-derives the chain over sealed entries (in id order) and checks each stored link. `content_changed`: the
 * entry was edited after sealing. `link_broken`: an entry before it was removed, or one was inserted.
 */
export function verifyChain(
  rows: (EvidenceEntry & { prevHash: string; hash: string })[],
  key: string | null,
): ChainVerdict {
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prevHash !== prev)
      return { ok: false, entries: rows.length, brokenAt: r.id, reason: "link_broken" };
    if (linkHash(prev, r, key) !== r.hash)
      return { ok: false, entries: rows.length, brokenAt: r.id, reason: "content_changed" };
    prev = r.hash;
  }
  return { ok: true, entries: rows.length, head: prev };
}
