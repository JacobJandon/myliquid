import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { cancelOrder } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    return json({ order: cancelOrder(getDb(), investorId, id) });
  },
);
