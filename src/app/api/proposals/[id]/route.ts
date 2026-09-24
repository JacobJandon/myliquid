import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { approveProposal, rejectProposal } from "@/lib/services/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DecisionBody = z.object({ action: z.enum(["approve", "reject"]) });

export const POST = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const investorId = await requireApiInvestor();
    const { id } = await params;
    const { action } = await parseBody(req, DecisionBody);
    const db = getDb();
    return json({
      proposal:
        action === "approve"
          ? approveProposal(db, investorId, id)
          : rejectProposal(db, investorId, id),
    });
  },
);
