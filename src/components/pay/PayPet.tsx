"use client";

import { useEffect, useState } from "react";
import type { Mood, PetColor, Stage } from "@/lib/domain/companion";
import { TamaDevice, type LcdEvent, type LcdEventKind } from "@/components/pet/TamaDevice";

const PET_EVENT = "myliquid:pet";

/** Lets any panel on the page make the pet react on its screen. */
export function firePetEvent(kind: LcdEventKind): void {
  window.dispatchEvent(new CustomEvent<LcdEventKind>(PET_EVENT, { detail: kind }));
}

/** Map a payment decision to the pet's reaction. */
export function petEventForDecision(decision: string): LcdEventKind {
  return decision === "approve" ? "pay" : decision === "needs_approval" ? "ask" : "no";
}

/** The pet at the till: its screen shows PAID!, ASK OWNER or NO! as payments happen. */
export function PayPet({
  name,
  stage,
  mood,
  color,
  level,
}: {
  name: string;
  stage: Stage;
  mood: Mood;
  color: PetColor;
  level: number;
}) {
  const [event, setEvent] = useState<LcdEvent | null>(null);

  useEffect(() => {
    let seq = 0;
    const onEvent = (e: Event) => {
      seq += 1;
      const id = seq;
      setEvent({ kind: (e as CustomEvent<LcdEventKind>).detail, id });
      setTimeout(() => setEvent((cur) => (cur?.id === id ? null : cur)), 2600);
    };
    window.addEventListener(PET_EVENT, onEvent);
    return () => window.removeEventListener(PET_EVENT, onEvent);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <TamaDevice
        name={name}
        stage={stage}
        mood={mood}
        color={color}
        level={level}
        size={168}
        event={event}
        className="!mx-0 shrink-0"
      />
      <p className="text-sm text-fg-2">
        {name} taps with the agent card. Watch its screen: <b className="text-fg">PAID!</b>,{" "}
        <b className="text-fg">ASK OWNER</b> when it needs your OK, or{" "}
        <b className="text-fg">NO!</b> when your policy says no.
      </p>
    </div>
  );
}
