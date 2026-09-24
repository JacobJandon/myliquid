import { handle, ndjsonStream } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { runDeskCycle } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  return ndjsonStream(req, (emit, signal) => runDeskCycle(investorId, emit, signal));
});
