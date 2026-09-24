import Link from "next/link";
import {
  ArrowRight,
  Bitcoin,
  Briefcase,
  Building2,
  Droplets,
  Gauge,
  Hand,
  LineChart,
  Lock,
  OctagonAlert,
  Plug,
  ScrollText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AGENTS, DESK_AGENTS } from "@/lib/agents/registry";
import { AgentAvatar, buttonClass } from "@/components/ui";
import { GuestButton } from "@/components/auth/forms";

const SLEEVES = [
  {
    icon: TrendingUp,
    name: "Index funds",
    liquidity: "Daily · T+1",
    text: "Global, US and bond index funds at the core of every portfolio.",
    color: "var(--sleeve-index)",
  },
  {
    icon: LineChart,
    name: "Active trading",
    liquidity: "Daily · T+1",
    text: "Systematic strategies run by Quant, with signals you can inspect.",
    color: "var(--sleeve-trading)",
  },
  {
    icon: Bitcoin,
    name: "Bitcoin",
    liquidity: "Instant · 24/7",
    text: "Direct exposure, sized by your risk profile and never above its cap.",
    color: "var(--sleeve-bitcoin)",
  },
  {
    icon: Briefcase,
    name: "Business interests",
    liquidity: "Quarterly, gated · or locked",
    text: "Revenue share and minority stakes in real, profitable businesses.",
    color: "var(--sleeve-business)",
  },
  {
    icon: Building2,
    name: "Private equity & credit",
    liquidity: "Locked 4–7 years",
    text: "Senior loans and growth equity, independently valued every month.",
    color: "var(--sleeve-private)",
  },
];

const GUARDRAILS = [
  {
    icon: Hand,
    title: "You approve by default",
    text: "Agents propose; trades wait in your inbox. Autonomy is opt-in, bounded by caps, a budget and a sleeve whitelist.",
  },
  {
    icon: ShieldCheck,
    title: "Pre-trade checks on everything",
    text: "Sentinel checks every order from you, an agent, a rule or the API against your limits before it touches the ledger.",
  },
  {
    icon: OctagonAlert,
    title: "A kill switch that works",
    text: "One click pauses every agent. A circuit breaker pulls it automatically on a sharp daily drop. Only you can release it.",
  },
  {
    icon: Lock,
    title: "Agents can't withdraw",
    text: "Moving money off the platform is human-only. No agent has a tool for it.",
  },
  {
    icon: ScrollText,
    title: "Append-only audit log",
    text: "Every run, tool call, proposal and blocked order is recorded, as FINRA expects for agent supervision.",
  },
  {
    icon: Gauge,
    title: "Rate limits against herding",
    text: "Per-order, daily and order-count caps damp the correlated bursts regulators worry about.",
  },
];

const LESSONS = [
  {
    bad: "Promise daily liquidity on assets that take years to sell",
    good: "Liquidity terms match the asset: lock-ups and gates are stated before you invest, and the ladder shows them every day.",
  },
  {
    bad: "Let the originator mark its own bonds",
    good: "An independent appraiser values every private position monthly. Ledger flags stale, self-marked or too-smooth marks.",
  },
  {
    bad: "Concentrate in one charismatic originator with circular financing",
    good: "No originator above 5% of a portfolio. Scout rejects related-party and circular deals outright.",
  },
];

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export default function LandingPage() {
  return (
    <div className="bg-glow min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-fg">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">
            <Droplets className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MyLiquid</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-fg-2 md:flex">
          <a href="#desk" className="hover:text-fg">
            Agents
          </a>
          <a href="#liquidity" className="hover:text-fg">
            Liquidity
          </a>
          <a href="#guardrails" className="hover:text-fg">
            Guardrails
          </a>
          <a href="#connect" className="hover:text-fg">
            Connect
          </a>
          <a href="#why" className="hover:text-fg">
            Why
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs text-fg-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> The agentic wealth platform
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-fg sm:text-6xl lg:text-7xl">
              AI agents for your money.{" "}
              <span className="italic text-gradient">Honest about liquidity.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-fg-2">
              A desk of specialist AI agents researches, trades and guards one portfolio across
              index funds, bitcoin, business interests and private markets. They always tell you how
              quickly you could get your money back.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GuestButton label="Try the live demo" variant="primary" />
              <Link href="/signup" className={buttonClass("secondary")}>
                Create an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              The demo opens a private guest portfolio in one click, with no sign-up. Simulated
              markets, demo money.
            </p>
          </div>

          {/* Hero visual: a desk snapshot */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-accent/20 via-transparent to-accent-2/25 blur-2xl"
              aria-hidden
            />
            <div className="relative space-y-3 rounded-3xl border border-line-strong bg-surface/90 p-5 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Agent desk · today</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" /> live
                </span>
              </div>
              {[
                {
                  a: "ledger",
                  t: "Nordhavn bond is marked by its own originator. 18% a year with no volatility is not a real mark.",
                },
                {
                  a: "scout",
                  t: "Rejected Nordhavn Shipyard Bond: circular financing, related party, 22% originator exposure.",
                },
                {
                  a: "sentinel",
                  t: "Bitcoin is above your 5% limit. 75% of the portfolio could be cash within 7 days; the rest is locked or gated.",
                },
                {
                  a: "atlas",
                  t: "Cash is 8 points over target. Proposed a rebalance into index funds and the momentum strategy. Locked positions are never sold.",
                },
              ].map(({ a, t }) => (
                <div
                  key={a}
                  className="flex gap-3 rounded-2xl border border-line bg-surface-2/70 p-3"
                >
                  <AgentAvatar agent={a} size="sm" />
                  <div className="text-sm">
                    <span className="font-medium text-fg">
                      {AGENTS[a as keyof typeof AGENTS].name}
                    </span>
                    <p className="text-fg-2">{t}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm">
                <span className="text-fg">Rebalance to Balanced targets (2 orders)</span>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink">
                  Approve
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sleeves */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl text-fg">One portfolio, five sleeves.</h2>
          <p className="mt-2 max-w-2xl text-fg-2">
            Each with its liquidity on the label, not in the small print.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SLEEVES.map(({ icon: Icon, name, liquidity, text, color }) => (
              <div key={name} className="rounded-2xl border border-line bg-surface/70 p-5">
                <Icon className="h-5 w-5" style={{ color }} />
                <h3 className="mt-4 font-medium text-fg">{name}</h3>
                <div className="mt-1 text-xs text-accent">{liquidity}</div>
                <p className="mt-3 text-sm text-fg-2">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agents */}
        <section id="desk" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl text-fg">Meet the desk.</h2>
          <p className="mt-2 max-w-2xl text-fg-2">
            Separated duties, like a well-run fund: the agents that propose trades never value the
            book or police risk. Powered by Claude, with a deterministic offline mode.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...DESK_AGENTS, "copilot" as const].map((id) => {
              const a = AGENTS[id];
              return (
                <div key={id} className="rounded-2xl border border-line bg-surface/70 p-5">
                  <div className="flex items-center gap-3">
                    <AgentAvatar agent={id} size="lg" />
                    <div>
                      <h3 className="font-semibold text-fg">{a.name}</h3>
                      <div className="text-xs text-muted">{a.role}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-fg-2">{a.summary}</p>
                  <p className="mt-3 text-xs text-muted">
                    Can&apos;t: {lowerFirst(a.cannot[0] ?? "")}.
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Liquidity */}
        <section id="liquidity" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 rounded-3xl border border-line bg-surface/70 p-8 lg:grid-cols-2 lg:p-12">
            <div>
              <h2 className="font-display text-4xl text-fg">Know exactly how liquid you are.</h2>
              <p className="mt-4 text-fg-2">
                The liquidity ladder answers the one question most platforms dodge:{" "}
                <em>if I asked for everything back today, how much would I get, and when?</em>{" "}
                Settlement, notice periods, 5% quarterly gates and lock-ups are all included.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-fg-2">
                <li>• Private sleeves are locked or gated. We never call them liquid.</li>
                <li>• Your risk profile caps the illiquid share, from 10% to 45%.</li>
                <li>
                  • Gated redemptions are pro-rated and roll over, and you&apos;re told when it
                  happens.
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-6 items-end gap-2" style={{ height: 200 }} aria-hidden>
              {[
                ["Today", 18],
                ["7 days", 75],
                ["90 days", 75],
                ["1 year", 84],
                ["5 years", 100],
                ["Later", 100],
              ].map(([label, pct]) => (
                <div key={label} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="text-xs text-fg tabular">{pct}%</span>
                  <span
                    className="w-full rounded-t-[4px] bg-accent/90"
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guardrails */}
        <section id="guardrails" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl text-fg">Guardrails, not vibes.</h2>
          <p className="mt-2 max-w-3xl text-fg-2">
            Robinhood, Public, Webull and Coinbase now let AI agents trade. We studied what they
            ship and what has gone wrong (see <code className="text-xs">docs/research</code>), and
            made the safe version the default.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUARDRAILS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-surface/70 p-5">
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-medium text-fg">{title}</h3>
                <p className="mt-2 text-sm text-fg-2">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bring your own agent */}
        <section id="connect" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs text-fg-2">
                <Plug className="h-3.5 w-3.5 text-accent" /> Model Context Protocol
              </div>
              <h2 className="mt-4 font-display text-4xl text-fg">Bring your own agent.</h2>
              <p className="mt-3 text-fg-2">
                Connect Claude, or any other MCP client, with a scoped API key. A read key sees your
                portfolio, liquidity, deals and signals. A trade key can also propose trades and
                rules. Everything it does passes the same checks and approvals as the desk, and it
                can never withdraw money or change your guardrails.
              </p>
              <ul className="mt-5 space-y-1.5 text-sm text-fg-2">
                <li>• Keys are hashed, shown once, and revocable in one click</li>
                <li>• Every call lands in your audit log, attributed to the key</li>
                <li>• Rate-limited, same-origin protected, and blocked by the kill switch</li>
              </ul>
            </div>
            <pre className="overflow-x-auto rounded-3xl border border-line-strong bg-surface/90 p-6 text-[12px] leading-relaxed text-fg-2 shadow-2xl">
              <code>{`$ claude mcp add --transport http myliquid \\
    https://myliquid.app/api/mcp \\
    --header "Authorization: Bearer mlk_..."

> How liquid am I, and should I rebalance?

  get_liquidity_ladder()   75% within 7 days
  plan_rebalance()         cash +8pp over target
  propose_rebalance()      waiting for your approval`}</code>
            </pre>
          </div>
        </section>

        {/* Why */}
        <section id="why" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl text-fg">
            Built against the shadow-banking playbook.
          </h2>
          <p className="mt-2 max-w-3xl text-fg-2">
            Funds that took &ldquo;liquid&rdquo; retail money, bought bespoke bonds from one
            originator and marked them themselves ended with gates, side pockets and losses.
            MyLiquid inverts every step.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {LESSONS.map((l) => (
              <div key={l.bad} className="rounded-2xl border border-line bg-surface/70 p-5">
                <div className="text-xs uppercase tracking-wide text-muted">The trap</div>
                <p className="mt-1 text-sm text-fg-2 line-through decoration-critical/70">
                  {l.bad}
                </p>
                <div className="mt-4 text-xs uppercase tracking-wide text-accent">MyLiquid</div>
                <p className="mt-1 text-sm text-fg">{l.good}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <div className="rounded-3xl border border-line-strong bg-gradient-to-br from-accent/15 to-accent-2/15 p-10 text-center">
            <h2 className="font-display text-4xl text-fg sm:text-5xl">See the desk at work.</h2>
            <p className="mx-auto mt-3 max-w-xl text-fg-2">
              Run a desk cycle, approve a rebalance, try to buy the shipyard bond, and advance the
              market to watch settlements and gates.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <GuestButton label="Try the live demo" variant="primary" />
              <Link href="/signup" className={buttonClass("secondary")}>
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:px-6">
          <span>
            © {new Date().getFullYear()} MyLiquid. A demo platform: simulated markets, fictional
            products, not investment advice.
          </span>
          <span>Agents powered by Claude</span>
        </div>
      </footer>
    </div>
  );
}
