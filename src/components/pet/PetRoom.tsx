"use client";

import clsx from "clsx";
import { Check, Flame, Moon, Palette, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PET_COLORS, STAGES, type PetColor, type Stage } from "@/lib/domain/companion";
import type { CompanionView, QuizView } from "@/lib/services/companion";
import { AGENTS } from "@/lib/agents/registry";
import { postJson } from "@/components/client";
import { buttonClass } from "@/components/ui";
import { PixelPet } from "./PixelPet";
import { DeviceButton, TamaDevice, type LcdEvent, type LcdEventKind } from "./TamaDevice";

function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

interface ActionResponse {
  message: string;
  companion: CompanionView;
  quiz: QuizView;
  xp?: {
    awarded: number;
    levelUp: { level: number; stage: string; evolved: boolean } | null;
    questsCompleted: string[];
  };
  correct?: boolean;
}

interface Toast {
  id: number;
  text: string;
  tone: "xp" | "level";
}

function Meter({ label, value, icon }: { label: string; value: number; icon: string }) {
  const filled = Math.round(value / 10);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-fg-2">
          <span aria-hidden>{icon}</span> {label}
        </span>
        <span className="font-pixel text-[10px] text-muted">{value}</span>
      </div>
      <div
        className="flex gap-[3px]"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={clsx(
              "h-2.5 flex-1 rounded-[2px]",
              i < filled
                ? value < 25
                  ? "bg-critical"
                  : value < 50
                    ? "bg-warning"
                    : "bg-fg"
                : "bg-surface-3",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PetRoom({
  initial,
  initialQuiz,
}: {
  initial: CompanionView;
  initialQuiz: QuizView;
}) {
  const router = useRouter();
  const [pet, setPet] = useState(initial);
  const [quiz, setQuiz] = useState(initialQuiz);
  const [speech, setSpeech] = useState(initial.thought);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [customizing, setCustomizing] = useState(false);
  const [name, setName] = useState(initial.name);
  const [event, setEvent] = useState<LcdEvent | null>(null);
  const [screenMode, setScreenMode] = useState<"pet" | "stats">("pet");
  const toastId = useRef(0);
  const eventId = useRef(0);
  const checkedIn = useRef(initial.checkedInToday);

  /** Plays a short animation on the device's screen. */
  function fire(kind: LcdEventKind) {
    eventId.current += 1;
    const id = eventId.current;
    setScreenMode("pet");
    setEvent({ kind, id });
    setTimeout(() => setEvent((e) => (e?.id === id ? null : e)), 2600);
  }

  function toast(text: string, tone: Toast["tone"] = "xp") {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2900);
  }

  async function act(body: Record<string, unknown>, opts: { refresh?: boolean } = {}) {
    setBusy(true);
    try {
      const res = await postJson<ActionResponse>("/api/companion", body);
      setPet(res.companion);
      setQuiz(res.quiz);
      setSpeech(res.message);
      if (res.xp?.awarded) toast(`+${res.xp.awarded} XP`);
      if (res.xp?.questsCompleted.length) toast(`Quest complete!`, "level");
      if (res.xp?.levelUp) {
        toast(
          res.xp.levelUp.evolved
            ? `Evolved into a ${res.xp.levelUp.stage}!`
            : `Level ${res.xp.levelUp.level}!`,
          "level",
        );
        fire(res.xp.levelUp.evolved ? "evolve" : "levelup");
      } else if (body.action === "checkin" && res.xp?.awarded) fire("hello");
      else if (body.action === "feed" && res.xp?.awarded) fire("eat");
      else if (body.action === "play" && res.correct) fire("play");
      if (opts.refresh) router.refresh();
      return res;
    } catch (err) {
      setSpeech(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Visiting is the daily check-in.
  useEffect(() => {
    if (checkedIn.current) return;
    checkedIn.current = true;
    void act({ action: "checkin" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sleeping = pet.vitals.mood === "sleeping" || pet.vitals.mood === "scared";
  const stage = pet.stage.id as Stage;
  const nextStage = STAGES.find((s) => s.fromLevel > pet.level);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[300px_1fr_280px]">
        {/* The device */}
        <div className="relative flex flex-col items-center">
          <TamaDevice
            name={pet.name}
            stage={stage}
            mood={pet.vitals.mood}
            color={pet.color}
            level={pet.level}
            size={250}
            event={event}
            screenMode={screenMode}
            stats={{
              ageDays: pet.ageDays,
              fullness: pet.vitals.fullness,
              joy: pet.vitals.joy,
              energy: pet.vitals.energy,
              health: pet.vitals.health,
              liquidPct: pet.liquidPct,
            }}
            onScreenClick={() => setScreenMode((m) => (m === "pet" ? "stats" : "pet"))}
            buttons={
              <>
                <DeviceButton
                  size={250}
                  label="Feed"
                  onClick={() => act({ action: "feed" })}
                  disabled={busy || sleeping}
                />
                <DeviceButton
                  size={250}
                  label="Play"
                  onClick={() => setPlaying((p) => !p)}
                  disabled={busy || sleeping}
                  active={playing}
                />
                <DeviceButton size={250} label="Talk" onClick={() => router.push("/app/copilot")} />
              </>
            }
          />
          <div className="pointer-events-none absolute inset-x-0 -top-3 z-10 flex flex-wrap justify-center gap-1">
            {toasts.map((t) => (
              <span
                key={t.id}
                className={clsx(
                  "toast-float rounded-full px-2.5 py-1 font-pixel text-[11px] shadow",
                  t.tone === "level" ? "bg-accent-2 text-accent-2-ink" : "bg-fg text-bg",
                )}
              >
                {t.text}
              </span>
            ))}
          </div>
          <p className="mt-3 font-pixel text-[10px] uppercase text-muted">
            {screenMode === "stats" ? "Tap the screen to go back" : "Tap the screen for stats"}
          </p>
        </div>

        {/* Status */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl text-fg">{pet.name}</h2>
            <span className="rounded-full bg-fg px-2 py-0.5 font-pixel text-[10px] uppercase text-bg">
              {pet.stage.name} · LV {pet.level}
            </span>
            {pet.streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-fg-2">
                <Flame className="h-3 w-3 text-serious" aria-hidden /> {pet.streak}-day streak
              </span>
            )}
            <button
              className="ml-auto text-muted hover:text-fg"
              onClick={() => setCustomizing((c) => !c)}
              aria-label="Customize your pet"
            >
              <Palette className="h-4 w-4" />
            </button>
          </div>

          {pet.presence && (
            <div className="flex min-w-0 items-center gap-2 text-xs text-fg-2">
              <span
                className={clsx(
                  "h-2 w-2 shrink-0 rounded-full",
                  sleeping ? "bg-muted" : "animate-pulse-dot bg-good",
                )}
                aria-hidden
              />
              <span className="shrink-0 font-pixel text-[10px] uppercase text-muted">Latest</span>
              <span className="truncate">
                {(() => {
                  const who =
                    pet.presence.agent === "copilot"
                      ? pet.name
                      : (AGENTS[pet.presence.agent as keyof typeof AGENTS]?.name ??
                        pet.presence.agent);
                  return pet.presence.title.startsWith(who)
                    ? pet.presence.title
                    : `${who}: ${pet.presence.title}`;
                })()}
              </span>
              <span className="shrink-0 text-muted">· {ago(pet.presence.minutesAgo)}</span>
            </div>
          )}

          {customizing && (
            <form
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void act({ action: "customize", name }).then(() => setCustomizing(false));
              }}
            >
              <input
                className="h-9 w-36 rounded-full border border-line-strong bg-surface px-3 text-sm outline-none focus:border-fg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                aria-label="Pet name"
              />
              {(Object.keys(PET_COLORS) as PetColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => act({ action: "customize", color: c })}
                  className={clsx(
                    "h-7 w-7 rounded-full border-2",
                    pet.color === c ? "border-fg" : "border-transparent",
                  )}
                  style={{ background: PET_COLORS[c] }}
                  aria-label={`${c} shell`}
                />
              ))}
              <button className={buttonClass("primary", "sm")}>Save</button>
            </form>
          )}

          {/* Speech bubble or quiz */}
          <div className="relative rounded-2xl border-2 border-fg bg-surface px-4 py-3 text-sm text-fg shadow-[3px_3px_0_#111]">
            {playing ? (
              <div>
                <div className="font-medium">{quiz.question}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quiz.options.map((opt, i) => (
                    <button
                      key={opt + i}
                      className={buttonClass("secondary", "sm")}
                      disabled={busy}
                      onClick={async () => {
                        await act({ action: "play", answerIndex: i, seed: quiz.seed });
                        setPlaying(false);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p>{speech}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-3">
            <Meter label="Mood" value={pet.vitals.moodScore} icon="♥" />
            <Meter label="Portfolio health" value={pet.vitals.health} icon="✚" />
            <Meter label="Fullness" value={pet.vitals.fullness} icon="🍙" />
            <Meter label="Energy" value={pet.vitals.energy} icon="⚡" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[11px] text-fg-2">
              <span>
                XP {pet.xp} · {pet.xpToNext} to level {pet.level + 1}
              </span>
              <span className="text-muted">
                {nextStage
                  ? `Evolves into ${nextStage.name} at LV ${nextStage.fromLevel}`
                  : "Fully evolved"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border-2 border-fg bg-surface-2">
              <div
                className="h-full bg-accent-2"
                style={{ width: `${Math.round(pet.levelPct * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quests + care */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-pixel text-[11px] uppercase">Today&apos;s quests</span>
              <span className="text-[11px] text-muted">+{pet.xpToday} XP today</span>
            </div>
            <ul className="space-y-2">
              {pet.quests.map((q) => (
                <li key={q.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-2",
                      q.done ? "border-fg bg-fg text-bg" : "border-line-strong",
                    )}
                    aria-hidden
                  >
                    {q.done && <Check className="h-3 w-3" />}
                  </span>
                  <span className={clsx(q.done ? "text-muted line-through" : "text-fg")}>
                    {q.title}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-muted">
              {pet.name} earns XP for habits (deciding, reviewing, checking in), never for trading
              more.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sleeping ? (
              <button
                className={buttonClass("primary", "sm")}
                disabled={busy}
                onClick={() => act({ action: "wake" }, { refresh: true })}
              >
                <Sun className="h-3.5 w-3.5" /> Wake {pet.name}
              </button>
            ) : (
              <button
                className={buttonClass("secondary", "sm")}
                disabled={busy}
                onClick={() => act({ action: "sleep" }, { refresh: true })}
                title="Pauses every agent and autopilot rule"
              >
                <Moon className="h-3.5 w-3.5" /> Put to sleep
              </button>
            )}
            <Link href="/app/agents" className={buttonClass("secondary", "sm")}>
              Run the desk
            </Link>
          </div>
          <p className="text-[11px] leading-snug text-muted">
            Sleep is the kill switch: it pauses every agent. Only you can wake {pet.name}.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Small pet badge for the sidebar and headers. */
export function MiniPet({
  name,
  color,
  stage,
  mood,
  level,
}: {
  name: string;
  color: PetColor;
  stage: Stage;
  mood: CompanionView["vitals"]["mood"];
  level: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-fg bg-lcd">
        <PixelPet stage={stage} mood={mood} color={color} lcd size={32} />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-fg">{name}</div>
        <div className="font-pixel text-[9px] uppercase text-muted">
          LV {level} · {mood}
        </div>
      </div>
    </div>
  );
}
