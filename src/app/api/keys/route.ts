import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { createApiKey, listApiKeys } from "@/lib/services/apiKeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KeyBody = z.object({
  name: z.string().trim().min(1).max(60),
  scopes: z.array(z.enum(["read", "trade", "pay"])).min(1),
});

export const GET = handle(async () =>
  json({ keys: listApiKeys(getDb(), await requireApiInvestor()) }),
);

/** Creates a key. The full key is returned once and never stored. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { name, scopes } = await parseBody(req, KeyBody);
  return json(createApiKey(getDb(), investorId, name, scopes));
});
