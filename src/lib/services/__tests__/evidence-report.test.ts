import { describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase } from "@/lib/db";
import { executeOrder } from "../orders";
import { approveProposal, listProposals } from "../proposals";
import { runOpeningRebalance } from "@/lib/agents/runner";
import { evidenceReport } from "../evidenceReport";

describe("evidence report", () => {
  it("counts what the controls actually did, under SAFR and FINRA headings", () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    executeOrder(db, ID, { productId: "MLUS", side: "buy", amountCents: 100_00 }, "user");
    // Blocked by the checks: the shipyard bond fails diligence.
    executeOrder(db, ID, { productId: "DL-NORDHAVN", side: "buy", amountCents: 5_000_00 }, "user");
    runOpeningRebalance(db, ID);
    const [proposal] = listProposals(db, ID, { status: "pending" });
    if (proposal) approveProposal(db, ID, proposal.id);

    const { facts, sections } = evidenceReport(db, ID);
    expect(facts.orders.blocked).toBeGreaterThanOrEqual(1);
    expect(facts.orders.byAgents).toBeGreaterThanOrEqual(1);
    expect(facts.proposals.approved).toBe(proposal ? 1 : 0);
    expect(facts.chain.ok).toBe(true);
    expect(sections.map((s) => s.title)).toEqual([
      "Policy-bound execution",
      "Real-time validation before execution",
      "Auditability",
      "Interoperability",
      "Track agent actions",
      "Restrict access",
      "Supervision",
      "Books and records",
    ]);
    const blocked = sections
      .find((s) => s.id === "safr-validation")!
      .items.find((i) => i.label === "Orders blocked by the checks")!;
    expect(blocked.value).toEqual({ count: facts.orders.blocked });
  });

  it("says so when the record was changed", () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    executeOrder(db, ID, { productId: "MLUS", side: "buy", amountCents: 100_00 }, "user");
    evidenceReport(db, ID); // seals
    db.prepare("UPDATE agent_events SET title = 'edited' WHERE investor_id = ?").run(ID);
    const audit = evidenceReport(db, ID).sections.find((s) => s.id === "safr-audit")!;
    expect(audit.items[0]!.label).toBe("Activity log changed after it was sealed");
  });
});
