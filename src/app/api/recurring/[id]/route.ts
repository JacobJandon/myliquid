import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { deletePlan, setPlanStatus } from "@/lib/services/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const StatusBody = z.object({ status: z.enum(["active", "paused"]) });

export const PATCH = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    const { status } = await parseBody(req, StatusBody);
    return json({ plan: setPlanStatus(getDb(), investorId, id, status) });
  },
);

export const DELETE = handle(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    deletePlan(getDb(), investorId, id);
    return json({ ok: true });
  },
);
