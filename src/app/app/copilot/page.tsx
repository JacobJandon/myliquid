import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { agentMode } from "@/lib/agents/llm";
import { getTranscript } from "@/lib/agents/runner";
import type { Stage } from "@/lib/domain/companion";
import { getCompanionView } from "@/lib/services/companion";
import { CopilotChat } from "@/components/app/CopilotChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Talk" };

export default async function CopilotPage() {
  const { id } = await requireInvestor();
  const db = getDb();
  const pet = getCompanionView(db, id);
  return (
    <CopilotChat
      initial={getTranscript(db, id)}
      mode={agentMode()}
      pet={{
        name: pet.name,
        color: pet.color,
        stage: pet.stage.id as Stage,
        mood: pet.vitals.mood,
      }}
    />
  );
}
