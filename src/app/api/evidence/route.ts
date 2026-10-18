import { getDb } from "@/lib/db";
import { handle } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { exportEvidence } from "@/lib/services/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The investor's sealed Activity log, every entry with its hash link, as a JSON file. */
export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  const evidence = exportEvidence(getDb(), investorId);
  return new Response(JSON.stringify(evidence, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="myliquid-evidence-${evidence.generatedAt.slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
});
