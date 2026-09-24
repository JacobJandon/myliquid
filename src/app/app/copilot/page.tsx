import { agentMode } from "@/lib/agents/llm";
import { getTranscript } from "@/lib/agents/runner";
import { CopilotChat } from "@/components/app/CopilotChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copilot" };

export default function CopilotPage() {
  return <CopilotChat initial={getTranscript()} mode={agentMode()} />;
}
