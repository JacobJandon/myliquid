import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase } from "@/lib/db";
import { GENESIS, canonicalEntry, verifyChain } from "@/lib/domain/evidence";
import { logEvent } from "../audit";
import { evidenceStatus, exportEvidence, sealActivity } from "../evidence";

afterEach(() => vi.unstubAllEnvs());

const fresh = () => {
  const db = openDatabase(":memory:", { today: "2026-10-15" });
  for (let i = 0; i < 5; i++)
    logEvent(db, ID, { agent: "atlas", kind: "system", title: `Entry ${i}`, payload: { i } });
  return db;
};
const ids = (db: ReturnType<typeof fresh>) =>
  (
    db.prepare("SELECT id FROM agent_events WHERE investor_id = ? ORDER BY id").all(ID) as {
      id: number;
    }[]
  ).map((r) => r.id);

describe("tamper-evident Activity", () => {
  it("seals new entries once, in order, and verifies the chain", () => {
    const db = fresh();
    const total = ids(db).length;
    expect(sealActivity(db, ID)).toBe(total);
    expect(sealActivity(db, ID)).toBe(0);
    logEvent(db, ID, { agent: "user", kind: "system", title: "Later entry" });
    const status = evidenceStatus(db, ID);
    expect(status.verdict).toMatchObject({ ok: true, entries: total + 1 });
  });

  it("shows an entry edited after sealing", () => {
    const db = fresh();
    sealActivity(db, ID);
    const target = ids(db)[2]!;
    db.prepare("UPDATE agent_events SET title = 'Nothing happened here' WHERE id = ?").run(target);
    expect(evidenceStatus(db, ID).verdict).toMatchObject({
      ok: false,
      brokenAt: target,
      reason: "content_changed",
    });
  });

  it("shows an entry removed from the middle", () => {
    const db = fresh();
    sealActivity(db, ID);
    const all = ids(db);
    db.prepare("DELETE FROM agent_events WHERE id = ?").run(all[1]);
    expect(evidenceStatus(db, ID).verdict).toMatchObject({
      ok: false,
      brokenAt: all[2],
      reason: "link_broken",
    });
  });

  it("with a key, a chain recomputed without it doesn't verify", () => {
    vi.stubEnv("MYLIQUID_EVIDENCE_KEY", "a-server-secret-of-32-characters!");
    const db = fresh();
    expect(evidenceStatus(db, ID)).toMatchObject({ keyed: true, verdict: { ok: true } });
    // An insider with the database but not the key edits an entry and rebuilds every link with plain SHA-256.
    const rows = exportEvidence(db, ID).entries;
    rows[1]!.title = "Rewritten";
    let prev = GENESIS;
    const forged = rows.map((r) => {
      const hash = createHash("sha256")
        .update(`myliquid-evidence-v1\n${prev}\n${canonicalEntry(r)}`)
        .digest("hex");
      const out = { ...r, prevHash: prev, hash };
      prev = hash;
      return out;
    });
    expect(verifyChain(forged, "a-server-secret-of-32-characters!").ok).toBe(false);
  });

  it("exports a log an auditor can re-derive from the documented format alone", () => {
    const db = fresh();
    const file = exportEvidence(db, ID);
    expect(file.keyed).toBe(false);
    let prev = file.genesis;
    for (const e of file.entries) {
      expect(e.prevHash).toBe(prev);
      const canonical = JSON.stringify([
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
      prev = createHash("sha256")
        .update(`myliquid-evidence-v1\n${prev}\n${canonical}`)
        .digest("hex");
      expect(e.hash).toBe(prev);
    }
    expect(file.verdict).toMatchObject({ ok: true, head: prev });
  });
});
