import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { createRule, listRules } from "@/lib/services/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RuleBody = z.object({
  productId: z.string(),
  condition: z.enum([
    "price_below",
    "price_above",
    "drawdown_below",
    "weight_above",
    "weight_below",
  ]),
  threshold: z.number(),
  action: z.enum(["buy", "sell"]),
  amountUsd,
  name: z.string().max(120).optional(),
});

export const GET = handle(async () =>
  json({ rules: listRules(getDb(), await requireApiInvestor()) }),
);

export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, RuleBody);
  return json({
    rule: createRule(
      getDb(),
      investorId,
      { ...body, amountCents: toCents(body.amountUsd) },
      "user",
    ),
  });
});
