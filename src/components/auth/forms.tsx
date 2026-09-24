"use client";

import clsx from "clsx";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PET_COLORS, type PetColor } from "@/lib/domain/companion";
import { postJson } from "@/components/client";
import { PixelPet } from "@/components/pet/PixelPet";
import { buttonClass } from "@/components/ui";

const input =
  "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-fg";

const selected = "border-fg bg-surface-2 text-fg shadow-[2px_2px_0_#111]";

export function GuestButton({
  label = "Try the demo",
  variant = "secondary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action="/api/auth/guest" method="post">
      <button type="submit" className={clsx(buttonClass(variant), "w-full sm:w-auto")}>
        {label} <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/login", { email, password });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-xs text-fg-2">Email</span>
          <input
            className={clsx(input, "mt-1")}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs text-fg-2">Password</span>
          <input
            className={clsx(input, "mt-1")}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-xs text-critical">{error}</p>}
        <button className={clsx(buttonClass("primary"), "w-full")} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Log in
        </button>
      </form>
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <GuestButton label="Explore a guest demo" />
      <p className="text-center text-xs text-fg-2">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

type Profile = "conservative" | "balanced" | "growth" | "aggressive";

const QUESTIONS: { q: string; options: string[] }[] = [
  {
    q: "When will you need most of this money?",
    options: ["Within 3 years", "In 3–7 years", "In 7+ years"],
  },
  {
    q: "Your portfolio falls 20% in a month. You…",
    options: ["Sell to stop the loss", "Hold and wait", "Buy more"],
  },
  {
    q: "How much might you need to withdraw within a year?",
    options: ["More than 30%", "10–30%", "Less than 10%"],
  },
];

const PROFILES: { id: Profile; label: string; text: string }[] = [
  { id: "conservative", label: "Conservative", text: "≤10% locked up · ≤2% bitcoin" },
  { id: "balanced", label: "Balanced", text: "≤25% locked up · ≤5% bitcoin" },
  { id: "growth", label: "Growth", text: "≤35% locked up · ≤10% bitcoin" },
  { id: "aggressive", label: "Aggressive", text: "≤45% locked up · ≤15% bitcoin" },
];

export function recommendProfile(answers: number[]): Profile {
  const score = answers.reduce((s, a) => s + a, 0);
  return score <= 1
    ? "conservative"
    : score <= 3
      ? "balanced"
      : score <= 5
        ? "growth"
        : "aggressive";
}

const PET_NAMES = ["Drip", "Pip", "Mochi", "Bubbles", "Nimbus", "Splash", "Tofu", "Ripple"];

/** Step 0 of sign-up: hatch your own agent. */
function AdoptPet({
  name,
  color,
  onName,
  onColor,
}: {
  name: string;
  color: PetColor;
  onName: (name: string) => void;
  onColor: (color: PetColor) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-fg bg-surface p-3 shadow-[3px_3px_0_#111]">
      <span className="bg-glow flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-fg">
        <PixelPet
          stage="drop"
          mood="ecstatic"
          color={color}
          size={84}
          title={`${name || "Your agent"}, just hatched`}
        />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <input
          className={clsx(input, "h-10")}
          placeholder="Name your agent"
          maxLength={20}
          value={name}
          onChange={(e) => onName(e.target.value)}
          aria-label="Agent name"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(PET_COLORS) as PetColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(c)}
              className={clsx(
                "h-7 w-7 rounded-full border-2",
                color === c ? "border-fg" : "border-transparent",
              )}
              style={{ background: PET_COLORS[c] }}
              aria-label={`${c} shell`}
              aria-pressed={color === c}
            />
          ))}
          <button
            type="button"
            className="ml-auto text-[11px] text-fg-2 underline-offset-2 hover:underline"
            onClick={() => onName(PET_NAMES[(PET_NAMES.indexOf(name) + 1) % PET_NAMES.length]!)}
          >
            Suggest a name
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignupForm({
  isGuest,
  pet,
}: {
  isGuest: boolean;
  pet?: { name: string; color: PetColor };
}) {
  const router = useRouter();
  const [petNameInput, setPetName] = useState(pet?.name ?? "");
  const [petColor, setPetColor] = useState<PetColor>(pet?.color ?? "blue");
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [starter, setStarter] = useState<"cash" | "sample">("cash");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = answers.every((a) => a !== null);
  const recommended = answered ? recommendProfile(answers as number[]) : null;
  const chosen = profile ?? recommended;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/signup", {
        name,
        email,
        password,
        riskProfile: chosen,
        starter,
        pet: { name: petNameInput.trim() || undefined, color: petColor },
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        <div className="font-pixel text-[11px] uppercase text-muted">
          1 · {isGuest ? "Your agent" : "Hatch your agent"}
        </div>
        <AdoptPet name={petNameInput} color={petColor} onName={setPetName} onColor={setPetColor} />
        <p className="text-[11px] text-fg-2">
          It lives in your account, runs your agent desk and carries a card it can pay with. It
          grows when you build good habits, never when you trade more.
        </p>
      </section>

      <section className="space-y-4">
        <div className="font-pixel text-[11px] uppercase text-muted">2 · Your risk profile</div>
        {QUESTIONS.map((question, qi) => (
          <fieldset key={qi}>
            <legend className="text-sm text-fg">{question.q}</legend>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {question.options.map((opt, oi) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => {
                    setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)));
                    setProfile(null);
                  }}
                  className={clsx(
                    "rounded-xl border px-2 py-2 text-[11px] leading-tight",
                    answers[qi] === oi
                      ? selected
                      : "border-line text-fg-2 hover:border-line-strong",
                  )}
                  aria-pressed={answers[qi] === oi}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        {recommended && (
          <div>
            <div className="text-xs text-fg-2">
              We suggest{" "}
              <span className="font-medium text-fg">
                {PROFILES.find((p) => p.id === recommended)?.label}
              </span>
              . You can change it any time.
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PROFILES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  className={clsx(
                    "rounded-xl border p-2 text-left",
                    chosen === p.id ? selected : "border-line hover:border-line-strong",
                  )}
                  aria-pressed={chosen === p.id}
                >
                  <div className="text-xs font-medium text-fg">{p.label}</div>
                  <div className="text-[10px] text-muted">{p.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="font-pixel text-[11px] uppercase text-muted">3 · Your account</div>
        <input
          className={input}
          placeholder="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
        />
        <input
          className={input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        <input
          className={input}
          type="password"
          placeholder="Password (8+ characters)"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />
        {isGuest ? (
          <p className="text-xs text-fg-2">
            Your guest portfolio, agent activity and settings will be kept.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                {
                  id: "cash",
                  label: "Start fresh",
                  text: "$100,000 demo cash. Your agent builds your allocation.",
                },
                {
                  id: "sample",
                  label: "Sample portfolio",
                  text: "A year-old portfolio with issues for the agents to find.",
                },
              ] as const
            ).map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setStarter(o.id)}
                className={clsx(
                  "rounded-xl border p-2 text-left",
                  starter === o.id ? selected : "border-line hover:border-line-strong",
                )}
                aria-pressed={starter === o.id}
              >
                <div className="text-xs font-medium text-fg">{o.label}</div>
                <div className="text-[10px] text-muted">{o.text}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-xs text-critical">{error}</p>}
      <button className={clsx(buttonClass("primary"), "w-full")} disabled={busy || !chosen}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {!chosen
          ? "Answer the three questions first"
          : isGuest
            ? "Save my account"
            : `Hatch ${petNameInput.trim() || "my agent"} & create my account`}
      </button>
      <p className="text-center text-xs text-fg-2">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
