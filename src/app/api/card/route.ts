import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { CATEGORY_LABELS, type MerchantCategory } from "@/lib/domain/payments";
import { getCard, updateCard } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cents = z.number().int().min(0).max(10_000_00);
const categories = Object.keys(CATEGORY_LABELS) as [MerchantCategory, ...MerchantCategory[]];

const CardBody = z
  .object({
    status: z.enum(["active", "frozen"]),
    perPaymentLimitCents: cents,
    approvalThresholdCents: cents,
    dailyLimitCents: cents,
    monthlyLimitCents: cents,
    allowedCategories: z.array(z.enum(categories)),
  })
  .partial();

export const GET = handle(async () => json({ card: getCard(getDb(), await requireApiInvestor()) }));

/** Human-only: the agent card's spending policy. */
export const PATCH = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const patch = await parseBody(req, CardBody);
  return json({ card: updateCard(getDb(), investorId, patch) });
});
