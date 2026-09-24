import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { decidePayment } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DecisionBody = z.object({ action: z.enum(["approve", "decline"]) });

/** The owner approves or declines a payment the agent held for review. */
export const POST = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    const { action } = await parseBody(req, DecisionBody);
    return json(decidePayment(getDb(), investorId, id, action === "approve"));
  },
);
