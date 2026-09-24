import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { x402Purchase } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  productId: z.string().max(40),
  quotedPrice: z.string().max(12).optional(),
});

/** In-app version of the x402 flow: Scout pays for a premium report from the agent wallet. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { productId } = await parseBody(req, Body);
  const result = x402Purchase(getDb(), investorId, productId, "scout");
  const findings = (result.data?.findings as string[] | undefined) ?? [];
  return json({ decision: result.decision, message: result.message, findings });
});
