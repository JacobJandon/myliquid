import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { revokeTraderIdentity } from "@/lib/services/hostedTraders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Revokes a hosted trader's AINRA identity at the live registrar; MyLiquid cuts it off straight away. */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  return json(await revokeTraderIdentity(getDb(), investorId, id));
});
