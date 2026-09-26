import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { cancelLimitOrder } from "@/lib/services/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handle(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    return json({ order: cancelLimitOrder(getDb(), investorId, id) });
  },
);
