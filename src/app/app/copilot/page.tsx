import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { agentMode } from "@/lib/agents/llm";
import { getTranscript } from "@/lib/agents/runner";
import { CopilotChat } from "@/components/app/CopilotChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copilot" };

export default async function CopilotPage() {
  const { id } = await requireInvestor();
  return <CopilotChat initial={getTranscript(getDb(), id)} mode={agentMode()} />;
}
