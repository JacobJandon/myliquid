import clsx from "clsx";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { AgentId, Severity, Sleeve } from "@/lib/domain/types";
import { AGENTS } from "@/lib/agents/registry";

export function Card({
  id,
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-24 rounded-card border border-line bg-surface shadow-[0_1px_0_rgba(17,17,17,0.04)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            {title && <h2 className="type-title text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-fg-2">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {/* Tighter on phones; a card that sets its own body padding (p-0 for tables) keeps it. */}
      <div className={bodyClassName ?? "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export type Tone = "neutral" | "good" | "warning" | "serious" | "critical" | "accent" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "border-line-strong text-fg-2",
  good: "border-good/40 text-fg",
  warning: "border-warning/40 text-fg",
  serious: "border-serious/40 text-fg",
  critical: "border-critical/50 text-fg",
  accent: "border-accent/40 text-fg",
  violet: "border-accent-2/40 text-fg",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-muted",
  good: "bg-good",
  warning: "bg-warning",
  serious: "bg-serious",
  critical: "bg-critical",
  accent: "bg-accent",
  violet: "bg-accent-2",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", DOTS[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function severityTone(s: Severity): Tone {
  return s === "critical" ? "critical" : s === "warn" ? "warning" : "neutral";
}

export function SeverityIcon({
  severity,
  className,
}: {
  severity: Severity | "good";
  className?: string;
}) {
  const cls = clsx("h-4 w-4 shrink-0", className);
  if (severity === "critical")
    return <OctagonAlert className={clsx(cls, "text-critical")} aria-label="Critical" />;
  if (severity === "warn")
    return <AlertTriangle className={clsx(cls, "text-warning")} aria-label="Warning" />;
  if (severity === "good")
    return <CheckCircle2 className={clsx(cls, "text-good")} aria-label="OK" />;
  return <Info className={clsx(cls, "text-muted")} aria-label="Info" />;
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "min-w-0 rounded-card border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="kicker text-muted">{label}</div>
      <div className="mt-1.5 truncate font-display text-[1.375rem] leading-none tracking-[-0.03em] text-fg tabular-nums sm:text-[1.625rem]">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] leading-snug text-fg-2 sm:text-xs">{sub}</div>}
    </div>
  );
}

export function AgentAvatar({
  agent,
  size = "md",
}: {
  agent: AgentId | string;
  size?: "sm" | "md" | "lg";
}) {
  const def = AGENTS[agent as AgentId];
  const label =
    def?.name ??
    (agent === "user"
      ? "You"
      : agent === "system"
        ? "Platform"
        : agent === "autopilot"
          ? "Autopilot"
          : agent);
  const accent = def?.accent ?? (agent === "user" ? "#111111" : "#86837b");
  const dims =
    size === "sm"
      ? "h-6 w-6 text-[10px]"
      : size === "lg"
        ? "h-11 w-11 text-base"
        : "h-8 w-8 text-xs";
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        dims,
      )}
      style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}55` }}
      title={label}
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function agentLabel(agent: string): string {
  return (
    AGENTS[agent as AgentId]?.name ??
    (agent === "user" ? "You" : agent === "system" ? "Platform" : agent)
  );
}

export const SLEEVE_COLORS: Record<Sleeve, string> = {
  cash: "var(--sleeve-cash)",
  index: "var(--sleeve-index)",
  trading: "var(--sleeve-trading)",
  bitcoin: "var(--sleeve-bitcoin)",
  business: "var(--sleeve-business)",
  private: "var(--sleeve-private)",
};

export function buttonClass(
  variant: "primary" | "secondary" | "ghost" | "danger" | "accent" = "secondary",
  size: "xs" | "sm" | "md" = "md",
) {
  return clsx(
    // Presses go down into the paper; the primary's blue hard shadow shrinks as it does (rules.md §4).
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,box-shadow,background-color,color] duration-[180ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] active:duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
    size === "xs"
      ? "h-7 px-2.5 text-[11px]"
      : size === "sm"
        ? "h-8 px-3 text-xs"
        : "h-10 px-4 text-sm",
    variant === "primary" &&
      "bg-fg text-bg shadow-[3px_3px_0_var(--accent)] not-disabled:hover:-translate-x-px not-disabled:hover:-translate-y-px not-disabled:hover:shadow-[4px_4px_0_var(--accent)] not-disabled:active:translate-x-[2px] not-disabled:active:translate-y-[2px] not-disabled:active:shadow-[1px_1px_0_var(--accent)]",
    variant === "accent" &&
      "bg-accent text-accent-ink shadow-[3px_3px_0_var(--fg)] not-disabled:hover:-translate-y-px not-disabled:active:translate-x-[2px] not-disabled:active:translate-y-[2px] not-disabled:active:shadow-[1px_1px_0_var(--fg)]",
    variant === "secondary" &&
      "border border-line-strong bg-surface text-fg hover:bg-surface-2 not-disabled:active:translate-y-px",
    variant === "ghost" && "text-fg-2 hover:bg-surface-2 hover:text-fg not-disabled:active:translate-y-px",
    variant === "danger" &&
      "border border-critical/50 bg-critical/10 text-fg hover:bg-critical/20 not-disabled:active:translate-y-px",
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <Link href={href} className={buttonClass(variant, size)}>
      {children}
    </Link>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-2">
      {children}
    </div>
  );
}
