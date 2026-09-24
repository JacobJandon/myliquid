import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { awardXp } from "@/lib/services/companion";
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
    const proposal =
      action === "approve"
        ? approveProposal(db, investorId, id)
        : rejectProposal(db, investorId, id);
    // Deciding (either way) is the habit the pet rewards, not trading.
    awardXp(db, investorId, "decide_proposal");
    return json({ proposal });
  },
);
