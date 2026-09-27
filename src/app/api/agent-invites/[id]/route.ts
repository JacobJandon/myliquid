import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { cancelInvite } from "@/lib/services/agentInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  cancelInvite(getDb(), investorId, id);
  return json({ ok: true });
});
