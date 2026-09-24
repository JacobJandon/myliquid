import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { endSession, requireApiInvestor } from "@/lib/auth/current";
import { deleteInvestor } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Permanently deletes the signed-in investor and all of their data. */
export const DELETE = handle(async () => {
  const investorId = await requireApiInvestor();
  await endSession();
  deleteInvestor(getDb(), investorId);
  return json({ ok: true });
});
