import { handle, ndjsonStream } from "@/lib/api";
import { runDeskCycle } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 300;

export const POST = handle((req: Request) =>
  ndjsonStream(req, (emit, signal) => runDeskCycle(emit, signal)),
);
