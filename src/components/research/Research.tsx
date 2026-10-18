"use client";

import clsx from "clsx";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postJson } from "@/components/client";
import { buttonClass } from "@/components/ui";

/**
 * MyLiquid's research instruments (docs/discovery/2-research-and-validation.md): the product-market-fit survey,
 * the early-access list, Gate design-partner requests and AINRA interest. Answers go to /api/research.
 */

const input =
  "h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg outline-none placeholder:text-muted focus:border-fg";
const area =
  "w-full rounded-xl border border-line-strong bg-surface p-3 text-sm text-fg outline-none placeholder:text-muted focus:border-fg";
const chip = (on: boolean) =>
  clsx(
    "rounded-full border px-3 py-1.5 text-xs transition",
    on ? "border-fg bg-fg text-bg" : "border-line-strong bg-surface text-fg hover:border-fg",
  );

/** Reports a page view once, when the page is really shown (not on prefetch). */
export function TrackView({
  name,
  props,
}: {
  name: "landing_viewed";
  props?: Record<string, string>;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    }).catch(() => {});
  }, [name, props]);
  return null;
}

function useSubmit() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const submit = async (body: unknown) => {
    setState("busy");
    setError(null);
    try {
      await postJson("/api/research", body);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  };
  return { state, error, submit };
}

function Consent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-xs text-fg-2">
      <input
        type="checkbox"
        className="mt-0.5 accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        MyLiquid may email me about this research. Nothing else, and I can ask to be removed any
        time (
        <Link href="/privacy" className="underline">
          privacy
        </Link>
        ).
      </span>
    </label>
  );
}

function Thanks({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-good/40 bg-good/10 px-4 py-3 text-sm text-fg"
      role="status"
    >
      <Check className="h-4 w-4 text-good" /> {children}
    </div>
  );
}

// ── Product-market fit (Sean Ellis) ──────────────────────────────────────────

const PMF = [
  ["very", "Very disappointed"],
  ["somewhat", "Somewhat disappointed"],
  ["not", "Not disappointed"],
  ["na", "I don't really use it"],
] as const;

export function PmfSurvey() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [benefit, setBenefit] = useState("");
  const [who, setWho] = useState("");
  const [improve, setImprove] = useState("");
  const [hidden, setHidden] = useState(false);
  const { state, error, submit } = useSubmit();
  if (hidden) return null;
  if (state === "done") return <Thanks>Thank you. This decides what we build next.</Thanks>;
  return (
    <section
      aria-label="Quick question"
      className="rounded-2xl border-2 border-fg bg-surface p-5 shadow-[4px_4px_0_#111]"
      data-research="pmf"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-pixel text-[10px] uppercase text-accent">
            One question · 30 seconds
          </div>
          <h2 className="mt-1 font-display text-xl text-fg">
            How would you feel if you could no longer use MyLiquid?
          </h2>
        </div>
        <button
          type="button"
          aria-label="Not now"
          className="rounded-full p-1 text-muted hover:text-fg"
          onClick={() => {
            setHidden(true);
            void postJson("/api/research", { kind: "pmf", answer: "dismissed" }).catch(() => {});
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PMF.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={chip(answer === id)}
            onClick={() => setAnswer(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {answer && answer !== "na" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-fg-2">
            What&apos;s the main thing you get from it?
            <textarea
              className={clsx(area, "mt-1 h-20")}
              value={benefit}
              onChange={(e) => setBenefit(e.target.value)}
            />
          </label>
          <label className="text-xs text-fg-2">
            Who else would it help most?
            <textarea
              className={clsx(area, "mt-1 h-20")}
              value={who}
              onChange={(e) => setWho(e.target.value)}
            />
          </label>
          <label className="text-xs text-fg-2">
            What should we improve?
            <textarea
              className={clsx(area, "mt-1 h-20")}
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={buttonClass("primary", "sm")}
          disabled={!answer || state === "busy"}
          onClick={() => submit({ kind: "pmf", answer, benefit, who, improve })}
        >
          {state === "busy" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send
        </button>
        {error && (
          <span className="text-xs text-critical" role="alert">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}

// ── Early access ─────────────────────────────────────────────────────────────

const SEGMENTS = [
  ["investor", "I invest my own money"],
  ["developer", "I build AI agents"],
  ["business", "I work at a broker or fintech"],
  ["other", "Something else"],
] as const;

const WANTS = [
  ["invest", "Invest regularly for me"],
  ["rebalance", "Rebalance my portfolio"],
  ["trade", "Trade on its own"],
  ["pay", "Pay bills and subscriptions"],
  ["research", "Research and explain"],
  ["nothing", "Nothing, I'd only let it advise"],
] as const;

export function WaitlistForm() {
  const [segment, setSegment] = useState<string | null>(null);
  const [wants, setWants] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const { state, error, submit } = useSubmit();
  if (state === "done")
    return <Thanks>You&apos;re on the list. We&apos;ll only write about early access.</Thanks>;
  return (
    <form
      className="space-y-4"
      data-research="waitlist"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          kind: "waitlist",
          segment,
          wants,
          today: today || undefined,
          email: email || undefined,
          consent,
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-medium text-fg">Which describes you?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEGMENTS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(segment === id)}
              onClick={() => setSegment(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-fg">
          What would you let an AI agent do with your money?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WANTS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(wants.includes(id))}
              onClick={() =>
                setWants(wants.includes(id) ? wants.filter((w) => w !== id) : [...wants, id])
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm text-fg">
        What do you use for this today? <span className="text-muted">(optional)</span>
        <input
          className={clsx(input, "mt-1")}
          value={today}
          onChange={(e) => setToday(e.target.value)}
          placeholder="A robo-adviser, ChatGPT, a spreadsheet, nothing…"
        />
      </label>
      <label className="block text-sm text-fg">
        Email <span className="text-muted">(optional, for early access)</span>
        <input
          type="email"
          className={clsx(input, "mt-1")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      {email && <Consent checked={consent} onChange={setConsent} />}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={buttonClass("primary")}
          disabled={!segment || state === "busy"}
        >
          {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Join early access
        </button>
        {error && (
          <span className="text-xs text-critical" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

// ── Gate design partners ─────────────────────────────────────────────────────

const TIMELINES = [
  ["now", "We have agents on accounts now"],
  ["quarter", "Within 3 months"],
  ["year", "Within a year"],
  ["exploring", "Just exploring"],
] as const;

export function DesignPartnerForm() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [agents, setAgents] = useState("");
  const [timeline, setTimeline] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const { state, error, submit } = useSubmit();
  if (state === "done")
    return <Thanks>Thanks. We&apos;ll reply within two working days to set up a call.</Thanks>;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      data-research="design_partner"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          kind: "design_partner",
          company,
          role,
          email,
          agents: agents || undefined,
          timeline,
          consent,
        });
      }}
    >
      <label className="text-sm text-fg">
        Company
        <input
          required
          className={clsx(input, "mt-1")}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      <label className="text-sm text-fg">
        Your role
        <input
          required
          className={clsx(input, "mt-1")}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Head of product, CCO, CTO…"
        />
      </label>
      <label className="text-sm text-fg sm:col-span-2">
        Work email
        <input
          required
          type="email"
          className={clsx(input, "mt-1")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="text-sm text-fg sm:col-span-2">
        How do AI agents reach your customers&apos; accounts today, and what worries you most?
        <textarea
          className={clsx(area, "mt-1 h-24")}
          value={agents}
          onChange={(e) => setAgents(e.target.value)}
        />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm text-fg">When do you need this?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIMELINES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chip(timeline === id)}
              onClick={() => setTimeline(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Consent checked={consent} onChange={setConsent} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          className={buttonClass("primary")}
          disabled={!timeline || !consent || state === "busy"}
        >
          {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Apply to be a design
          partner
        </button>
        {error && (
          <span className="text-xs text-critical" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

// ── AINRA ────────────────────────────────────────────────────────────────────

const ROLES = [
  ["agent_builder", "I build AI agents"],
  ["platform", "I run a platform agents connect to"],
  ["registrar", "I'd issue passports (registrar)"],
  ["researcher", "Research or policy"],
  ["other", "Other"],
] as const;

export function AinraInterestForm() {
  const [role, setRole] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const { state, error, submit } = useSubmit();
  if (state === "done") return <Thanks>Thanks. We read every one of these.</Thanks>;
  return (
    <form
      className="space-y-4"
      data-research="ainra_interest"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          kind: "ainra_interest",
          role,
          note: note || undefined,
          email: email || undefined,
          consent,
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {ROLES.map(([id, label]) => (
          <button key={id} type="button" className={chip(role === id)} onClick={() => setRole(id)}>
            {label}
          </button>
        ))}
      </div>
      <label className="block text-sm text-fg">
        What would you need from agent identity? <span className="text-muted">(optional)</span>
        <textarea
          className={clsx(area, "mt-1 h-20")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <label className="block text-sm text-fg">
        Email <span className="text-muted">(optional)</span>
        <input
          type="email"
          className={clsx(input, "mt-1")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {email && <Consent checked={consent} onChange={setConsent} />}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={buttonClass("primary")}
          disabled={!role || state === "busy"}
        >
          {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Send
        </button>
        {error && (
          <span className="text-xs text-critical" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
