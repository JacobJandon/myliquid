import { getDb } from "@/lib/db";
import { HttpError, handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { runTrader } from "@/lib/services/hostedTraders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Run now: the trader works again today, on the investor's request. */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const summary = await runTrader(getDb(), investorId, id, { force: true });
  if (!summary) throw new HttpError(409, "This trader is paused or gone.");
  return json({ summary });
});
