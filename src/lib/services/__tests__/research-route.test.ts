import { describe, expect, it, vi } from "vitest";
import { openDatabase, setDb } from "@/lib/db";
import { POST } from "@/app/api/research/route";

let signedIn: string | null = null;
vi.mock("@/lib/auth/current", () => ({ currentInvestorId: vi.fn(async () => signedIn) }));

const post = (body: unknown, ip = "198.51.100.10") =>
  POST(
    new Request("http://x/api/research", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
        "user-agent": "Mozilla/5.0 Chrome/141.0",
        cookie: "ml_vid=visitor-1",
      },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/research", () => {
  it("takes early-access answers, and an email only with consent", async () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    setDb(db);
    const base = { kind: "waitlist", segment: "investor", wants: ["invest"] };
    expect((await post({ ...base, email: "a@example.com", consent: false })).status).toBe(400);
    expect((await post({ ...base, email: "A@Example.com", consent: true })).status).toBe(200);
    expect((await post({ ...base, consent: false })).status).toBe(200);
    const rows = db.prepare("SELECT kind, visitor_id, email FROM research_responses").all();
    expect(rows).toEqual([
      { kind: "waitlist", visitor_id: "visitor-1", email: "a@example.com" },
      { kind: "waitlist", visitor_id: "visitor-1", email: null },
    ]);
    const ev = db.prepare("SELECT name FROM events").all();
    expect(ev).toEqual([{ name: "waitlist_joined" }, { name: "waitlist_joined" }]);
  });

  it("asks design partners for consent and a work email", async () => {
    setDb(openDatabase(":memory:", { today: "2026-10-15" }));
    const partner = {
      kind: "design_partner",
      company: "Acme Brokerage",
      role: "CCO",
      email: "cco@acme.example",
      timeline: "quarter",
    };
    expect((await post({ ...partner, consent: false }, "198.51.100.11")).status).toBe(400);
    expect((await post({ ...partner, consent: true }, "198.51.100.11")).status).toBe(200);
  });

  it("takes one PMF answer per signed-in person", async () => {
    setDb(openDatabase(":memory:", { today: "2026-10-15" }));
    signedIn = null;
    expect((await post({ kind: "pmf", answer: "very" }, "198.51.100.12")).status).toBe(401);
    signedIn = "inv_demo";
    expect(await (await post({ kind: "pmf", answer: "very" }, "198.51.100.12")).json()).toEqual({
      ok: true,
    });
    expect(await (await post({ kind: "pmf", answer: "not" }, "198.51.100.12")).json()).toEqual({
      ok: true,
      duplicate: true,
    });
  });
});
