import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { payRequest } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TapBody = z.object({ code: z.string().min(4).max(12) });

/** "Tap to pay": the investor holds the phone to a terminal and their agent pays under the card's policy. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { code } = await parseBody(req, TapBody);
  const result = payRequest(getDb(), investorId, code, "copilot");
  return json(result);
});
