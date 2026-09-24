import { HttpError, handle, ndjsonStream } from "@/lib/api";
import { isAgentId } from "@/lib/agents/registry";
import { runAgentRoutine } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 300;

export const POST = handle(
  async (req: Request, { params }: { params: Promise<{ agent: string }> }) => {
    const { agent } = await params;
    if (!isAgentId(agent) || agent === "copilot")
      throw new HttpError(404, `Unknown agent ${agent}`);
    return ndjsonStream(req, async (emit, signal) => {
      await runAgentRoutine(agent, "manual", emit, signal);
    });
  },
);
