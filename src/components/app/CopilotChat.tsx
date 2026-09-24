"use client";

import clsx from "clsx";
import { ArrowUp, Loader2, RotateCcw, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DeskEvent } from "@/lib/agents/events";
import type { Mood, PetColor, Stage } from "@/lib/domain/companion";
import { postJson, streamDesk } from "@/components/client";
import { Markdown } from "@/components/Markdown";
import { PixelPet } from "@/components/pet/PixelPet";
import { buttonClass } from "@/components/ui";

export interface ChatItem {
  id: number | string;
  role: "user" | "assistant";
  text: string;
  tools: string[];
}

const SUGGESTIONS = [
  "How liquid am I, really?",
  "Any risk issues I should know about?",
  "Rebalance my portfolio",
  "Review the Nordhavn shipyard bond",
  "What's in my wallet?",
  "Which terminals are nearby?",
  "If bitcoin falls 20% from its high, buy $1,000",
];

interface PetInfo {
  name: string;
  color: PetColor;
  stage: Stage;
  mood: Mood;
}

function PetAvatar({ pet, size = 36 }: { pet: PetInfo; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border-2 border-fg bg-lcd"
      style={{ width: size, height: size }}
    >
      <PixelPet
        stage={pet.stage}
        mood={pet.mood}
        color={pet.color}
        lcd
        size={size - 8}
        animate={false}
      />
    </span>
  );
}

export function CopilotChat({
  initial,
  mode,
  pet,
}: {
  initial: ChatItem[];
  mode: "claude" | "offline";
  pet: PetInfo;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ChatItem[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setNotice(null);
    setBusy(true);
    seq.current += 1;
    const replyId = `live-${seq.current}`;
    setItems((prev) => [
      ...prev,
      { id: `user-${seq.current}`, role: "user", text: message, tools: [] },
      { id: replyId, role: "assistant", text: "", tools: [] },
    ]);
    const patch = (fn: (item: ChatItem) => ChatItem) =>
      setItems((prev) => prev.map((it) => (it.id === replyId ? fn(it) : it)));
    try {
      await streamDesk("/api/copilot", { message }, (e: DeskEvent) => {
        if (e.type === "text") patch((it) => ({ ...it, text: it.text + e.delta }));
        else if (e.type === "tool_call") patch((it) => ({ ...it, tools: [...it.tools, e.tool] }));
        else if (e.type === "notice" || e.type === "error") setNotice(e.message);
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function clear() {
    await postJson("/api/copilot", undefined, "DELETE");
    setItems([]);
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-3">
          <PetAvatar pet={pet} size={40} />
          <div>
            <div className="text-sm font-semibold text-fg">{pet.name}</div>
            <div className="text-[11px] text-muted">
              {mode === "claude"
                ? "Powered by Claude"
                : "Offline mode (set ANTHROPIC_API_KEY for Claude)"}{" "}
              · uses the desk&apos;s tools with your live numbers
            </div>
          </div>
        </div>
        <button
          className={buttonClass("ghost", "sm")}
          onClick={clear}
          disabled={busy || items.length === 0}
        >
          <RotateCcw className="h-3.5 w-3.5" /> New chat
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {items.length === 0 && (
          <div className="mx-auto max-w-lg pt-6 text-center">
            <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-fg bg-lcd shadow-[4px_4px_0_#111]">
              <PixelPet stage={pet.stage} mood={pet.mood} color={pet.color} lcd size={92} />
            </div>
            <h2 className="font-display text-3xl text-fg">Talk to {pet.name}.</h2>
            <p className="mt-2 text-sm text-fg-2">
              {pet.name} answers from live tool calls, runs the agent desk and can pay terminals
              with its agent card. Nothing trades or pays without passing Sentinel&apos;s checks
              and, by default, your approval.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-fg-2 hover:border-fg hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className={clsx("flex gap-3", it.role === "user" && "justify-end")}>
            {it.role === "assistant" && <PetAvatar pet={pet} size={32} />}
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-3",
                it.role === "user" ? "bg-fg text-sm text-bg" : "border border-line bg-surface-2",
              )}
            >
              {it.tools.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {it.tools.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-fg-2"
                    >
                      <Wrench className="h-3 w-3" aria-hidden /> {t}
                    </span>
                  ))}
                </div>
              )}
              {it.role === "user" ? (
                <p className="whitespace-pre-wrap">{it.text}</p>
              ) : it.text ? (
                <Markdown>{it.text}</Markdown>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {notice && (
        <div className="mx-5 mb-2 rounded-lg border border-warning/40 px-3 py-2 text-xs text-fg-2">
          {notice}
        </div>
      )}
      <form
        className="flex items-end gap-2 border-t border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder={`Ask ${pet.name} about your portfolio, liquidity, deals or payments…`}
          aria-label={`Message ${pet.name}`}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-fg"
        />
        <button
          type="submit"
          className={clsx(buttonClass("primary"), "h-11 w-11 px-0")}
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
