import clsx from "clsx";
import { Nfc } from "lucide-react";
import type { PetColor, Stage } from "@/lib/domain/companion";
import { PixelPet } from "@/components/pet/PixelPet";

/** The agent card: a tokenized virtual card the pet carries. The agent never sees a card number. */
export function AgentCardVisual({
  last4,
  petName,
  color,
  stage,
  frozen,
  className,
}: {
  last4: string;
  petName: string;
  color: PetColor;
  stage: Stage;
  frozen: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "relative aspect-[1.586] w-full max-w-sm overflow-hidden rounded-3xl border-2 border-fg p-5 text-bg shadow-[6px_6px_0_#111]",
        frozen && "grayscale",
        className,
      )}
      style={{ background: "linear-gradient(135deg, #111 0%, #1d2a6b 55%, #2f5bff 100%)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-pixel text-[11px] uppercase tracking-wide text-accent-2">
            MyLiquid
          </div>
          <div className="text-xs opacity-80">Agent card</div>
        </div>
        <Nfc className="h-6 w-6 opacity-80" aria-hidden />
      </div>
      <div className="absolute right-4 bottom-12">
        <PixelPet stage={stage} mood={frozen ? "sleeping" : "happy"} color={color} size={64} />
      </div>
      <div className="absolute bottom-5 left-5">
        <div className="font-mono text-lg tracking-[0.2em]">•••• •••• •••• {last4}</div>
        <div className="mt-1 flex items-center gap-2 text-xs uppercase opacity-80">
          <span>{petName} · agentic token</span>
          {frozen && (
            <span className="rounded bg-bg px-1.5 py-0.5 font-pixel text-[9px] text-fg">
              Frozen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
