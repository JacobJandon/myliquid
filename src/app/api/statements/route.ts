import { getDb, simDate } from "@/lib/db";
import { handle } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { statementCsv } from "@/lib/services/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Downloads the investor's full account statement as CSV. */
export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  const db = getDb();
  return new Response(statementCsv(db, investorId), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="myliquid-statement-${simDate(db)}.csv"`,
      "cache-control": "no-store",
    },
  });
});
