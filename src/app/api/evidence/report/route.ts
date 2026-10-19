import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { evidenceReport } from "@/lib/services/evidenceReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The evidence report as JSON: the facts and the SAFR / FINRA sections built from them. */
export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  return json({ format: "myliquid-evidence-report-v1", ...evidenceReport(getDb(), investorId) });
});
