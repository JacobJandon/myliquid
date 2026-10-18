import { describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth/crypto";
import {
  activeDays,
  hasResponded,
  metrics,
  recordResponse,
  track,
  trackAppOpened,
} from "../analytics";
import { createInvestor, deleteInvestor } from "../investors";

const db = () => openDatabase(":memory:", { today: "2026-10-15" });

describe("analytics service", () => {
  it("records events, once a day for app opens, and builds the dashboard from them", () => {
    const d = db();
    const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));
    // Two visitors see the front page in different variants; one starts the demo and trades.
    track(d, "landing_viewed", { visitorId: "v1" }, { landing_headline: "pet" }, { now: day(10) });
    track(
      d,
      "landing_viewed",
      { visitorId: "v2" },
      { landing_headline: "safety" },
      { now: day(10) },
    );
    track(d, "guest_started", { visitorId: "v2", investorId: "inv_g" }, {}, { now: day(10) });
    track(d, "trade_placed", { investorId: "inv_g" }, { productId: "MLUS" }, { now: day(10) });
    for (const n of [10, 11])
      track(
        d,
        "app_opened",
        { investorId: "inv_g" },
        {},
        { now: day(n), dedupe: `app_opened:inv_g:${n}` },
      );
    track(
      d,
      "app_opened",
      { investorId: "inv_g" },
      {},
      { now: day(11), dedupe: "app_opened:inv_g:11" },
    );
    expect(activeDays(d, "inv_g")).toBe(2);

    const m = metrics(d, { today: "2026-10-16" });
    expect(m.funnel.map((f) => f.count)).toEqual([2, 1, 1, 0]);
    expect(m.retention[0]).toMatchObject({ day: 1, cohort: 1, retained: 1 });
    const exp = m.experiments[0]!;
    expect(exp.variants).toEqual([
      { variant: "pet", exposed: 1, converted: 0 },
      { variant: "safety", exposed: 1, converted: 1 },
    ]);
    expect(m.totals.find((t) => t.name === "app_opened")?.count).toBe(2);
  });

  it("keeps research answers, and the PMF score from them", () => {
    const d = db();
    recordResponse(d, "pmf", { investorId: "inv_a" }, { answer: "very", benefit: "Peace of mind" });
    recordResponse(d, "waitlist", { visitorId: "v9" }, { segment: "developer" }, "dev@example.com");
    expect(hasResponded(d, "inv_a", "pmf")).toBe(true);
    const m = metrics(d);
    expect(m.pmf).toMatchObject({ n: 1, veryShare: 1, verdict: "not enough answers" });
    expect(m.pmf.benefits).toEqual(["Peace of mind"]);
    expect(m.segments).toEqual([{ segment: "developer", count: 1 }]);
    expect(m.leads[0]).toMatchObject({ kind: "waitlist", email: "dev@example.com" });
  });

  it("forgets who someone was when their account is deleted", () => {
    const d = db();
    const id = createInvestor(d, {
      kind: "user",
      name: "Ada",
      email: "ada@example.com",
      passwordHash: hashPassword("password-1"),
      riskProfile: "balanced",
      starter: "cash",
    });
    trackAppOpened(d, id, "v-ada");
    recordResponse(
      d,
      "pmf",
      { investorId: id, visitorId: "v-ada" },
      { answer: "very" },
      "ada@example.com",
    );
    deleteInvestor(d, id, { forgetVisitor: true });
    const ev = d.prepare("SELECT investor_id, visitor_id FROM events").get() as Record<
      string,
      string | null
    >;
    expect(ev.investor_id).toMatch(/^anon_[0-9a-f]{16}$/);
    expect(ev.visitor_id).toBeNull();
    const res = d
      .prepare("SELECT investor_id, visitor_id, email FROM research_responses")
      .get() as Record<string, string | null>;
    expect(res).toEqual({ investor_id: ev.investor_id, visitor_id: null, email: null });
    // The anonymous count survives.
    expect(metrics(d).pmf.n).toBe(1);
  });
});
