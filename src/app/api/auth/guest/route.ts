import { getDb } from "@/lib/db";
import { handle, HttpError, json } from "@/lib/api";
import { startSession } from "@/lib/auth/current";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { deleteExpiredSessions } from "@/lib/auth/sessions";
import { createInvestor, pruneGuests, recentGuestCount } from "@/lib/services/investors";
import { trackRequest } from "@/lib/analytics/request";
import { runOpeningRebalance } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Guest accounts one visitor may open an hour, and all visitors together (`MYLIQUID_GUESTS_PER_HOUR`). */
const PER_VISITOR = 10;
const perHour = () => Number(process.env.MYLIQUID_GUESTS_PER_HOUR) || 500;

/**
 * One-click demo: creates a private guest account with a year-old sample
 * portfolio. Guests can save the account later by signing up.
 */
export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`guest:${ip}`, PER_VISITOR, 3_600_000))
    throw new HttpError(429, "You've opened a lot of guest accounts. Try again in an hour.");
  const db = getDb();
  pruneGuests(db);
  deleteExpiredSessions(db);
  if (recentGuestCount(db) >= perHour())
    throw new HttpError(429, "Lots of people are trying MyLiquid right now. Try again shortly.");
  const id = createInvestor(db, {
    kind: "guest",
    name: "Guest investor",
    riskProfile: "balanced",
    starter: "sample",
  });
  runOpeningRebalance(db, id);
  await startSession(id);
  trackRequest(req, "guest_started", id);
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  if (isForm) return new Response(null, { status: 303, headers: { location: "/app" } });
  return json({ ok: true });
});
