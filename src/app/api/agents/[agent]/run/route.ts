import { HttpError, handle, ndjsonStream } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { DESK_AGENTS, isAgentId } from "@/lib/agents/registry";
import { runAgentRoutine } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = handle(
  async (req: Request, { params }: { params: Promise<{ agent: string }> }) => {
    const investorId = await requireApiInvestor();
    const { agent } = await params;
    if (!isAgentId(agent) || !DESK_AGENTS.includes(agent))
      throw new HttpError(404, `Unknown agent ${agent}`);
    return ndjsonStream(req, async (emit, signal) => {
      await runAgentRoutine(investorId, agent, "manual", emit, signal);
    });
  },
);
