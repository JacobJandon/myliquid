import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  Check,
  Hand,
  Lock,
  Moon,
  Nfc,
  OctagonAlert,
  Plug,
  ScrollText,
  ShieldCheck,
  X,
} from "lucide-react";
import { AGENTS, DESK_AGENTS } from "@/lib/agents/registry";
import { STAGES, type Mood, type PetColor } from "@/lib/domain/companion";
import { AgentAvatar, buttonClass } from "@/components/ui";
import { GuestButton } from "@/components/auth/forms";
import { Logo } from "@/components/brand/Logo";
import { PixelPet } from "@/components/pet/PixelPet";
import { TamaDevice } from "@/components/pet/TamaDevice";
import { AgentCardVisual } from "@/components/pay/AgentCardVisual";

const SLEEVES = [
  { name: "Index funds", liquidity: "Daily", color: "var(--sleeve-index)" },
  { name: "Active trading", liquidity: "Daily", color: "var(--sleeve-trading)" },
  { name: "Bitcoin", liquidity: "24/7", color: "var(--sleeve-bitcoin)" },
  { name: "Business interests", liquidity: "Gated", color: "var(--sleeve-business)" },
  { name: "Private equity & credit", liquidity: "Locked 4–7y", color: "var(--sleeve-private)" },
];

const EVOLUTION: { mood: Mood; color: PetColor }[] = [
  { mood: "content", color: "blue" },
  { mood: "happy", color: "lime" },
  { mood: "happy", color: "pink" },
  { mood: "ecstatic", color: "orange" },
  { mood: "ecstatic", color: "violet" },
];

const GUARDRAILS = [
  { icon: Hand, text: "Agents propose; you approve by default" },
  { icon: ShieldCheck, text: "Sentinel checks every order and payment" },
  { icon: OctagonAlert, text: "A circuit breaker pulls the kill switch" },
  { icon: Lock, text: "No agent can withdraw money" },
  { icon: ScrollText, text: "Append-only audit log of every call" },
];

const LESSONS = [
  {
    bad: "Promise daily liquidity on assets that take years to sell",
    good: "Lock-ups and gates are on the label, and the ladder shows them every day.",
  },
  {
    bad: "Let the originator mark its own bonds",
    good: "Independent monthly marks. Ledger flags stale, self-marked or too-smooth ones.",
  },
  {
    bad: "Concentrate in one originator with circular financing",
    good: "No originator above 5%. Scout rejects related-party and circular deals.",
  },
];

/** A card in the bento grid. */
function Tile({
  className,
  children,
  tone = "surface",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "surface" | "ink" | "lime" | "blue";
}) {
  return (
    <div
      className={clsx(
        "relative min-w-0 overflow-hidden rounded-3xl border-2 border-fg p-6 shadow-[5px_5px_0_#111]",
        tone === "surface" && "bg-surface text-fg",
        tone === "ink" && "bg-fg text-bg",
        tone === "lime" && "bg-accent-2 text-accent-2-ink",
        tone === "blue" && "bg-accent text-accent-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("font-pixel text-[11px] uppercase", className)}>{children}</div>;
}

/** Floating event chip around the hero device. */
function Chip({
  className,
  icon,
  children,
}: {
  className?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "absolute flex items-center gap-2 rounded-full border-2 border-fg bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-[3px_3px_0_#111]",
        className,
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-glow min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-fg-2 md:flex">
          <a href="#alive" className="hover:text-fg">
            Your agent
          </a>
          <a href="#pay" className="hover:text-fg">
            Agent Pay
          </a>
          <a href="#desk" className="hover:text-fg">
            The desk
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
            Hatch yours <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-fg bg-surface px-3 py-1 text-xs font-medium text-fg shadow-[2px_2px_0_#111]">
              <span className="h-2 w-2 rounded-full bg-accent-2 ring-2 ring-fg" /> Agentic wealth ·
              Agent Pay · MCP
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.02] text-fg sm:text-6xl lg:text-[4.4rem]">
              Hatch an agent that invests, pays and{" "}
              <span className="highlight">grows with you.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-fg-2">
              Every MyLiquid account comes with a living agent. It runs a desk of specialists across
              index funds, trading, bitcoin, business interests and private equity, taps to pay at
              shop terminals with its own card, and levels up when you build good money habits.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GuestButton label="Try the live demo" variant="primary" />
              <Link href="/signup" className={buttonClass("secondary")}>
                Hatch your agent
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              One click opens a private guest account with its own pet. Simulated markets, demo
              money.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] py-6">
            <TamaDevice name="Drip" stage="splash" mood="happy" color="blue" level={5} size={260} />
            <Chip
              className="drift -left-2 top-0 sm:-left-10"
              icon={<Check className="h-3.5 w-3.5 text-good" aria-hidden />}
            >
              Paid Brew Lab $5.75
            </Chip>
            <Chip
              className="drift-slow right-0 top-[38%] sm:-right-8"
              icon={<X className="h-3.5 w-3.5 text-critical" aria-hidden />}
            >
              Blocked Nordhavn bond
            </Chip>
            <Chip
              className="drift -left-1 bottom-24 sm:-left-12"
              icon={<span className="h-2 w-2 rounded-full bg-accent" aria-hidden />}
            >
              75% liquid in 7 days
            </Chip>
            <Chip
              className="drift-slow -bottom-3 right-2 bg-accent-2 sm:-right-4"
              icon={<span aria-hidden>★</span>}
            >
              +10 XP · 6-day streak
            </Chip>
          </div>
        </section>

        {/* Sleeves strip */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="What it invests in">
          <div className="flex flex-wrap items-center gap-2 border-y-2 border-fg py-4">
            <span className="mr-2 font-pixel text-[11px] uppercase text-muted">Invests in</span>
            {SLEEVES.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-fg"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
                <span className="text-muted">· {s.liquidity}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Bento */}
        <section id="alive" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <h2 className="max-w-3xl font-display text-4xl text-fg sm:text-5xl">
            Not a chatbot. A pet with a job.
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            Your agent has moods, hunger and energy that change in real time, and it feels your
            portfolio: concentration or locked-up money makes it anxious. Look after it and it looks
            after you.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-6">
            <Tile className="lg:col-span-4">
              <Kicker className="text-muted">Evolves with your habits</Kicker>
              <h3 className="mt-2 font-display text-2xl">From Drop to Tide in ten levels.</h3>
              <p className="mt-2 max-w-lg text-sm text-fg-2">
                XP comes from checking in, deciding proposals, reviewing alerts and daily quests.
                Never from trading more, so the incentives point the right way.
              </p>
              <div className="mt-6 grid grid-cols-5 items-end gap-2 sm:gap-4">
                {STAGES.map((stage, i) => (
                  <div key={stage.id} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex aspect-square w-full max-w-[96px] items-end justify-center rounded-2xl border-2 border-fg bg-lcd p-1">
                      <PixelPet
                        stage={stage.id}
                        mood={EVOLUTION[i]!.mood}
                        color={EVOLUTION[i]!.color}
                        lcd
                        size={32 + i * 11}
                        animate={i === 4}
                      />
                    </div>
                    <div className="text-center leading-tight">
                      <div className="text-xs font-semibold text-fg">{stage.name}</div>
                      <div className="font-pixel text-[9px] uppercase text-muted">
                        LV {stage.fromLevel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile tone="lime" className="lg:col-span-2">
              <Kicker>Feed · Play · Sleep</Kicker>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <span className="font-semibold">Feed</span> it a research snack: one real fact
                  about your portfolio.
                </li>
                <li>
                  <span className="font-semibold">Play</span> the liquidity quiz: how much of you
                  could be cash in 7 days?
                </li>
                <li className="flex gap-2">
                  <Moon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-semibold">Sleep</span> is the kill switch. Every agent
                    stops, and only you can wake it.
                  </span>
                </li>
              </ul>
            </Tile>

            <Tile className="lg:col-span-2">
              <Kicker className="text-muted">Liquidity on the label</Kicker>
              <div className="mt-4 grid h-32 grid-cols-5 items-end gap-2" aria-hidden>
                {(
                  [
                    ["Now", 18],
                    ["7d", 75],
                    ["90d", 75],
                    ["1y", 84],
                    ["5y", 100],
                  ] as const
                ).map(([label, pct]) => (
                  <div key={label} className="flex h-full flex-col items-center justify-end gap-1">
                    <span className="text-[10px] tabular text-fg">{pct}%</span>
                    <span
                      className="w-full rounded-t-md border-2 border-fg bg-accent"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[10px] text-muted">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-fg-2">
                If you asked for everything back today, how much would you get, and when? Always
                answered.
              </p>
            </Tile>

            <Tile tone="ink" className="lg:col-span-2">
              <Kicker className="text-accent-2">Guardrails, not vibes</Kicker>
              <ul className="mt-4 space-y-2.5 text-sm">
                {GUARDRAILS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
            </Tile>

            <Tile className="lg:col-span-2">
              <Kicker className="text-muted">Bring your own AI</Kicker>
              <p className="mt-3 text-sm text-fg-2">
                Connect Claude or any MCP client with a scoped key: read, trade or pay. Same checks,
                same approvals.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-surface-2 p-3 text-[11px] leading-relaxed text-fg-2">
                <code>{`claude mcp add --transport http \\
  myliquid /api/mcp \\
  --header "Authorization: Bearer mlk_…"`}</code>
              </pre>
            </Tile>
          </div>
        </section>

        {/* Agent Pay */}
        <section id="pay" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <Kicker className="text-accent">Agent Pay</Kicker>
              <h2 className="mt-3 font-display text-4xl text-fg sm:text-5xl">
                Your agent taps to pay. You set the rules.
              </h2>
              <p className="mt-4 text-fg-2">
                A shop rings you up on a terminal. Your agent pays with its tokenized agent card
                from a wallet you fund, so it never sees a card number and can never spend more than
                you put in.
              </p>
              <ol className="mt-6 space-y-3">
                {[
                  [
                    "Hard rules decline",
                    "Card frozen, blocked category, per-payment, daily or monthly limit, empty wallet.",
                  ],
                  [
                    "Soft rules ask you",
                    "Big-ticket, first time at a merchant, a burst of payments, or the pet is asleep.",
                  ],
                  [
                    "Everything else just works",
                    "Coffee, groceries and rides go through, with the receipt in your feed.",
                  ],
                ].map(([title, text], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-fg bg-surface font-pixel text-[11px]">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-fg">{title}</div>
                      <div className="text-sm text-fg-2">{text}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/terminal" className={buttonClass("primary")}>
                  <Nfc className="h-4 w-4" /> Open a demo terminal
                </Link>
                <a href="#x402" className={buttonClass("secondary")}>
                  Pay-per-call data
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <AgentCardVisual
                last4="4242"
                petName="Drip"
                color="blue"
                stage="splash"
                frozen={false}
              />
              <div className="relative -mt-10 ml-auto w-[88%] rounded-3xl border-2 border-fg bg-surface p-4 shadow-[5px_5px_0_#111] sm:w-[78%]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-fg">☕ Brew Lab Coffee</span>
                  <span className="font-display text-xl tabular text-fg">$5.75</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {[
                    "Card active",
                    "Coffee is an allowed category",
                    "Under $50 approval line",
                    "Within daily limit",
                  ].map((c) => (
                    <div key={c} className="flex items-center gap-2 text-fg-2">
                      <Check className="h-3.5 w-3.5 text-good" aria-hidden /> {c}
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-good/10 px-3 py-2 text-xs font-medium text-fg">
                  Approved · paid by Drip, agent of Alex
                </div>
              </div>
            </div>
          </div>

          <div id="x402" className="mt-14 scroll-mt-6">
            <Tile tone="ink">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <Kicker className="text-accent-2">HTTP 402 · x402-style</Kicker>
                  <h3 className="mt-2 font-display text-3xl">Agents that buy what they need.</h3>
                  <p className="mt-3 text-sm text-bg/75">
                    Premium diligence data answers <code>402 Payment Required</code> with a price.
                    Scout pays 50¢ from the wallet, retries and gets the report, all under the same
                    card policy. Any MCP client with a pay-scoped key can do the same.
                  </p>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-bg/10 p-4 text-[11.5px] leading-relaxed text-bg/85">
                  <code>{`GET /api/x402/research/DL-NORDHAVN
← 402 Payment Required
  { "accepts": [{ "maxAmountRequired": "0.50",
                  "payTo": "Northbridge Data" }] }

GET /api/x402/research/DL-NORDHAVN
  Authorization: Bearer mlk_…
  X-PAYMENT: myliquid-wallet
← 200 OK   x-payment-response: {"success":true}
  { "findings": ["The group's auditor resigned…"] }`}</code>
                </pre>
              </div>
            </Tile>
          </div>
        </section>

        {/* The desk */}
        <section id="desk" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl text-fg sm:text-5xl">Your agent runs a desk.</h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            Separated duties, like a well-run fund: the agents that propose trades never value the
            book or police risk. Powered by Claude, with a deterministic offline mode.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DESK_AGENTS.map((id) => {
              const a = AGENTS[id];
              return (
                <div
                  key={id}
                  className="min-w-0 rounded-2xl border-2 border-fg bg-surface p-4 shadow-[3px_3px_0_#111]"
                >
                  <AgentAvatar agent={id} size="lg" />
                  <h3 className="mt-3 font-semibold text-fg">{a.name}</h3>
                  <div className="text-xs text-muted">{a.role}</div>
                  <p className="mt-2 text-sm text-fg-2">{a.summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why */}
        <section id="why" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <h2 className="max-w-3xl font-display text-4xl text-fg sm:text-5xl">
            Built against the shadow-banking playbook.
          </h2>
          <p className="mt-3 max-w-3xl text-fg-2">
            Funds that sold &ldquo;liquid&rdquo; products, bought bespoke bonds from one originator
            and marked them themselves ended with gates and losses. MyLiquid inverts every step.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {LESSONS.map((l) => (
              <div key={l.bad} className="rounded-2xl border border-line-strong bg-surface p-5">
                <Kicker className="text-muted">The trap</Kicker>
                <p className="mt-1 text-sm text-fg-2 line-through decoration-critical/70">
                  {l.bad}
                </p>
                <Kicker className="mt-4 text-accent">MyLiquid</Kicker>
                <p className="mt-1 text-sm text-fg">{l.good}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <div className="grid items-center gap-10 rounded-[2rem] border-2 border-fg bg-accent-2 p-8 shadow-[6px_6px_0_#111] sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-4xl text-accent-2-ink sm:text-5xl">
                Your agent is ready to hatch.
              </h2>
              <p className="mt-3 max-w-xl text-accent-2-ink/80">
                Name it, pick its shell, answer three questions. Then run the desk, approve a
                rebalance and let it buy you a coffee.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={buttonClass("primary")}>
                  Hatch your agent <ArrowRight className="h-4 w-4" />
                </Link>
                <GuestButton label="Try the live demo" />
              </div>
            </div>
            <div className="hidden items-end gap-3 sm:flex" aria-hidden>
              {(["pink", "blue", "orange"] as const).map((c, i) => (
                <div
                  key={c}
                  className="flex h-24 w-24 items-end justify-center rounded-2xl border-2 border-fg bg-lcd p-1"
                >
                  <PixelPet
                    stage={i === 1 ? "wave" : "droplet"}
                    mood="ecstatic"
                    color={c}
                    lcd
                    size={i === 1 ? 80 : 62}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-fg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:px-6">
          <Logo size="sm" />
          <span>
            © {new Date().getFullYear()} MyLiquid. A demo platform: simulated markets, fictional
            products and merchants, no real money. Not investment advice.
          </span>
          <span className="flex items-center gap-3">
            <Link href="/terminal" className="hover:text-fg">
              Merchant terminal
            </Link>
            <Plug className="h-3 w-3" aria-hidden />
            <span>Agents powered by Claude</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
