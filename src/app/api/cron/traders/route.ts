import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { runAllDueTraders } from "@/lib/services/hostedTraders";
import { ensureMarketCurrent } from "@/lib/services/sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily job (vercel.json `crons`): brings the market up to today and lets every investor's hosted traders work.
 * With CRON_SECRET set, Vercel sends it as a bearer token and nothing else is accepted. Each trader works at most
 * once per market day, so a stray call can't make anyone trade twice.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  const supplied = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const days = ensureMarketCurrent(db);
  const ran = await runAllDueTraders(db);
  return Response.json({ ok: true, marketDaysAdvanced: days, tradersRan: ran });
}
