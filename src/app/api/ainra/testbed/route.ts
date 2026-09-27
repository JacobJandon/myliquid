import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { TESTBED_AGENT_IDS, ainraMode, testbedBundle } from "@/lib/ainra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  agent: z.enum(TESTBED_AGENT_IDS),
  revoked: z.enum(["0", "1"]).default("0"),
});

/** A testbed agent's AINRA passport, for the Connect page's test drive (testbed mode only). */
export const GET = handle(async (req: Request) => {
  await requireApiInvestor();
  getDb();
  if (ainraMode() !== "testbed")
    throw new HttpError(404, "Testbed passports are only available in testbed mode.");
  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw new HttpError(400, "Unknown testbed agent");
  return Response.json(
    await testbedBundle(parsed.data.agent, { revoked: parsed.data.revoked === "1" }),
  );
});
