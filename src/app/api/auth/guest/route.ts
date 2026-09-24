import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { startSession } from "@/lib/auth/current";
import { deleteExpiredSessions } from "@/lib/auth/sessions";
import { createInvestor, pruneGuests } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click demo: creates a private guest account with a year-old sample
 * portfolio. Guests can save the account later by signing up.
 */
export const POST = handle(async (req: Request) => {
  const db = getDb();
  pruneGuests(db);
  deleteExpiredSessions(db);
  const id = createInvestor(db, {
    kind: "guest",
    name: "Guest investor",
    riskProfile: "balanced",
    starter: "sample",
  });
  await startSession(id);
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  if (isForm) return new Response(null, { status: 303, headers: { location: "/app" } });
  return json({ ok: true });
});
