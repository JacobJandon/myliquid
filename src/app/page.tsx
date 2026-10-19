import Image from "next/image";
import { marketsNote } from "@/lib/services/realPrices";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  Check,
  ChartSpline,
  CreditCard,
  Hand,
  LayoutGrid,
  Lock,
  Moon,
  Nfc,
  OctagonAlert,
  Plug,
  ScrollText,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { AGENTS, DESK_AGENTS } from "@/lib/agents/registry";
import { STAGES, type Mood, type PetColor } from "@/lib/domain/companion";
import { AgentAvatar, buttonClass } from "@/components/ui";
import { GuestButton } from "@/components/auth/forms";
import { TrackView, WaitlistForm } from "@/components/research/Research";
import { currentVisitor } from "@/lib/analytics/request";
import { EXPERIMENTS, assignVariant } from "@/lib/domain/analytics";
import { Logo } from "@/components/brand/Logo";
import { PixelPet } from "@/components/pet/PixelPet";
import { TamaDevice } from "@/components/pet/TamaDevice";
import { AgentCardVisual } from "@/components/pay/AgentCardVisual";
import { InstallAppButton } from "@/components/pwa/InstallApp";
import { PhoneQr } from "@/components/pwa/PhoneQr";
import { ANDROID_APK_URL } from "@/lib/mobile/links";

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

/** A card in the bento grid. Only the featured one gets the hard shadow (docs/design/rules.md §3). */
function Tile({
  className,
  children,
  tone = "surface",
  featured = false,
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "surface" | "ink" | "lime" | "blue";
  featured?: boolean;
}) {
  return (
    <div
      className={clsx(
        "reveal relative min-w-0 overflow-hidden rounded-card p-5 sm:p-6",
        featured
          ? "border-2 border-fg shadow-[4px_4px_0_var(--fg)]"
          : tone === "surface" && "border border-line-strong",
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

const APP_FEATURES = [
  {
    icon: ChartSpline,
    title: "Your money at a glance",
    text: "Your balance up top. Drag along the chart to read any day.",
  },
  {
    icon: LayoutGrid,
    title: "Five tabs, one thumb",
    text: "Home, Invest, Pay, Talk and More, like the apps you already use.",
  },
  {
    icon: CreditCard,
    title: "Your agent's card, in your pocket",
    text: "Approve a payment or freeze the card in a tap.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing stored on the phone",
    text: "Balances and orders always load fresh. Offline, it simply says so.",
  },
];

/** A phone-shaped frame around a screenshot of the app (`public/screenshots`). */
function PhoneFrame({
  src,
  alt,
  className,
  featured = false,
}: {
  src: string;
  alt: string;
  className?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-[2rem] border-[6px] border-fg bg-fg",
        featured
          ? "shadow-[6px_6px_0_var(--accent)]"
          : "shadow-[0_18px_40px_-18px_rgba(17,17,17,0.45)]",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={390}
        height={844}
        sizes="(min-width: 1024px) 240px, 60vw"
        className="block h-auto w-full rounded-[1.6rem]"
      />
    </div>
  );
}

function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("kicker", className)}>{children}</div>;
}

/** Kicker → heading → lede on one left edge (rules.md §2). */
function SectionHead({
  kicker,
  kickerClass = "text-accent",
  title,
  children,
  className,
}: {
  kicker?: string;
  kickerClass?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("reveal max-w-3xl", className)}>
      {kicker && <Kicker className={kickerClass}>{kicker}</Kicker>}
      <h2 className={clsx("type-h2 text-fg", kicker && "mt-2")}>{title}</h2>
      {children && <p className="type-lede mt-4">{children}</p>}
    </div>
  );
}

/** An event around the hero device: it pops in once (an event happened), then floats. */
function Chip({
  className,
  icon,
  children,
  i,
  slow = false,
  lime = false,
}: {
  className?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  i: number;
  slow?: boolean;
  lime?: boolean;
}) {
  return (
    <div
      className={clsx("anim-pop absolute", className)}
      style={{ ["--i" as string]: i, ["--d" as string]: "650ms" }}
    >
      <div
        className={clsx(
          slow ? "drift-slow" : "drift",
          "flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-fg shadow-[0_8px_20px_-10px_rgba(17,17,17,0.35)]",
          lime ? "bg-accent-2" : "bg-surface",
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{children}</span>
      </div>
    </div>
  );
}

/** What makes it safe to say yes, right under the hero. Each line is something the code enforces. */
const PROOF = [
  {
    kicker: "01 · Bounded",
    title: "It never sets its own limits.",
    text: "You set the caps, the approvals and what it may never do. No agent can change them or withdraw a cent.",
  },
  {
    kicker: "02 · Provable",
    title: "It proves what it did.",
    text: "Every action lands in a hash-chained record you can verify and download.",
  },
  {
    kicker: "03 · Identified",
    title: "It knows who's knocking.",
    text: "Outside agents act alone only with a verified AINRA passport. Everyone else just proposes.",
  },
];

/** The landing headline experiment (EXPERIMENTS.landing_headline): the pet (control) or safety first. */
const HEADLINES = {
  pet: {
    title: (
      <>
        Hatch an agent that invests, pays and{" "}
        <span className="highlight highlight-sweep">grows with you.</span>
      </>
    ),
    text: "Every MyLiquid account comes with a living agent. It runs a desk of specialists across index funds, trading, bitcoin, business interests and private equity, taps to pay at shop terminals with its own card, and levels up when you build good money habits.",
  },
  safety: {
    title: (
      <>
        Let an AI agent run your money,{" "}
        <span className="highlight highlight-sweep">on your rules.</span>
      </>
    ),
    text: "You set the limits; your agent invests, rebalances and pays inside them, asks before anything bigger, and shows you every decision. Only agents with a verified identity may act on their own, and one switch stops them all.",
  },
} as const;

export default async function LandingPage() {
  const visitor = await currentVisitor();
  const variant = (
    visitor.id ? assignVariant(visitor.id, EXPERIMENTS.landing_headline) : "pet"
  ) as keyof typeof HEADLINES;
  const headline = HEADLINES[variant];
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
          <a href="#app" className="hover:text-fg">
            The app
          </a>
          <Link href="/ainra" className="hover:text-fg">
            Agent identity
          </Link>
          <Link href="/business" className="hover:text-fg">
            For business
          </Link>
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
        {visitor.tracked && (
          <TrackView name="landing_viewed" props={{ landing_headline: variant }} />
        )}
        {/* Hero */}
        {/* Hero: it arrives in reading order (rules.md §4), the highlighter sweeps last. */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.25fr_0.9fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="min-w-0">
            <div className="anim-rise inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium text-fg">
              <span className="h-2 w-2 rounded-full bg-accent-2 ring-2 ring-fg" /> Agentic wealth ·
              Agent Pay · AINRA
            </div>
            <h1
              className="anim-rise type-hero mt-5 text-fg"
              style={{ ["--i" as string]: 1 }}
              data-variant={variant}
            >
              {headline.title}
            </h1>
            <p className="anim-rise type-lede mt-6" style={{ ["--i" as string]: 2 }}>
              {headline.text}
            </p>
            <div className="anim-rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
              <GuestButton label="Try the live demo" variant="primary" />
              <Link href="/signup" className={buttonClass("secondary")}>
                Hatch your agent
              </Link>
            </div>
            <p className="anim-rise mt-5 text-xs text-muted" style={{ ["--i" as string]: 4 }}>
              One click opens a private guest account with its own pet. {marketsNote()}.
            </p>
          </div>

          <div
            className="anim-rise relative mx-auto w-full max-w-[420px] py-6 max-sm:[zoom:0.8]"
            style={{ ["--i" as string]: 2 }}
          >
            <TamaDevice name="Drip" stage="splash" mood="happy" color="blue" level={5} size={260} />
            <Chip
              i={0}
              className="-left-2 top-0 sm:-left-10"
              icon={<Check className="h-3.5 w-3.5 text-good" aria-hidden />}
            >
              Paid Brew Lab $5.75
            </Chip>
            <Chip
              i={1}
              slow
              className="right-0 top-[38%] sm:-right-8"
              icon={<X className="h-3.5 w-3.5 text-critical" aria-hidden />}
            >
              Blocked Nordhavn bond
            </Chip>
            <Chip
              i={2}
              className="-left-1 bottom-24 sm:-left-12"
              icon={<span className="h-2 w-2 rounded-full bg-accent" aria-hidden />}
            >
              75% liquid in 7 days
            </Chip>
            <Chip
              i={3}
              slow
              lime
              className="-bottom-3 right-2 sm:-right-4"
              icon={<span aria-hidden>★</span>}
            >
              +10 XP · 6-day streak
            </Chip>
          </div>
        </section>

        {/* Why it's safe to say yes */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Why it's safe">
          <div className="grid gap-4 sm:grid-cols-3">
            {PROOF.map((p) => (
              <div
                key={p.kicker}
                className="reveal rounded-card border border-line-strong bg-surface p-5"
              >
                <Kicker className="text-accent">{p.kicker}</Kicker>
                <h2 className="type-title mt-2 text-[16px] text-fg">{p.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sleeves strip */}
        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6" aria-label="What it invests in">
          <div className="flex flex-wrap items-center gap-2 border-y border-line-strong py-4">
            <span className="kicker mr-2 text-muted">Invests in</span>
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
        <section id="alive" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24">
          <SectionHead kicker="Your agent" title="Not a chatbot. A pet with a job.">
            Your agent has moods, hunger and energy that change in real time, and it feels your
            portfolio: concentration or locked-up money makes it anxious. Look after it and it looks
            after you.
          </SectionHead>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-6">
            <Tile className="lg:col-span-4" featured>
              <Kicker className="text-muted">Evolves with your habits</Kicker>
              <h3 className="type-h3 mt-2">From Drop to Tide in ten levels.</h3>
              <p className="mt-2 max-w-lg text-sm text-fg-2">
                XP comes from checking in, deciding proposals, reviewing alerts and daily quests.
                Never from trading more, so the incentives point the right way.
              </p>
              <div className="mt-6 grid grid-cols-5 items-end gap-2 sm:gap-4">
                {STAGES.map((stage, i) => (
                  <div key={stage.id} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex aspect-square w-full max-w-[96px] items-end justify-center rounded-[10px] border-2 border-fg bg-lcd p-1">
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
                      <div className="kicker text-muted">LV {stage.fromLevel}</div>
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
              <div className="bars-timeline mt-4 grid h-32 grid-cols-5 items-end gap-2" aria-hidden>
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
                    <span className="num text-[10px] text-fg">{pct}%</span>
                    <span
                      className="reveal-grow-y w-full rounded-t-md border-2 border-fg bg-accent"
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
                same approvals. Pin the key to the agent&apos;s AINRA passport to know who is behind
                it, and cut it off the moment its passport is revoked.
              </p>
              <pre className="num mt-4 overflow-x-auto rounded-[10px] bg-surface-2 p-3 text-[11px] leading-relaxed text-fg-2">
                <code>{`claude mcp add --transport http \\
  myliquid /api/mcp \\
  --header "Authorization: Bearer mlk_…"`}</code>
              </pre>
            </Tile>
          </div>
        </section>

        {/* Agent Pay */}
        <section id="pay" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <SectionHead kicker="Agent Pay" title="Your agent taps to pay. You set the rules.">
                A shop rings you up on a terminal. Your agent pays with its tokenized agent card
                from a wallet you fund, so it never sees a card number and can never spend more than
                you put in.
              </SectionHead>
              <ol className="reveal mt-8 space-y-3">
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
                    <span className="kicker flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-fg bg-surface">
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
              <div className="reveal relative -mt-10 ml-auto w-[88%] rounded-card border-2 border-fg bg-surface p-4 shadow-[4px_4px_0_var(--fg)] sm:w-[78%]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-fg">☕ Brew Lab Coffee</span>
                  <span className="num text-xl font-medium text-fg">$5.75</span>
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
                <div className="mt-3 rounded-[10px] bg-good/10 px-3 py-2 text-xs font-medium text-fg">
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
                  <h3 className="type-h3 mt-2">Agents that buy what they need.</h3>
                  <p className="mt-3 text-sm text-bg/75">
                    Premium diligence data answers <code>402 Payment Required</code> with a price.
                    Scout pays 50¢ from the wallet, retries and gets the report, all under the same
                    card policy. Any MCP client with a pay-scoped key can do the same.
                  </p>
                </div>
                <pre className="num overflow-x-auto rounded-[10px] bg-bg/10 p-4 text-[11.5px] leading-relaxed text-bg/85">
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

        {/* The app */}
        <section id="app" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="min-w-0">
              <SectionHead kicker="The app" title="MyLiquid in your pocket.">
                Your portfolio, your pet and your agent&apos;s card on your home screen. Free on
                Android and iPhone, straight from the browser: no app store, nothing to update.
              </SectionHead>
              <ul className="reveal mt-8 space-y-4">
                {APP_FEATURES.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-fg bg-accent-2 text-accent-2-ink">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="text-sm">
                      <div className="font-medium text-fg">{title}</div>
                      <div className="text-fg-2">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <InstallAppButton />
                <a href={ANDROID_APK_URL} className={buttonClass("secondary")}>
                  <Smartphone className="h-4 w-4" aria-hidden /> Android app (.apk)
                </a>
              </div>
              <div className="mt-6 hidden max-w-md items-center gap-4 rounded-card border border-line-strong bg-surface p-4 lg:flex">
                <PhoneQr size={104} />
                <div className="text-sm">
                  <div className="font-medium text-fg">Scan to open it on your phone</div>
                  <div className="mt-0.5 text-fg-2">
                    Then tap <b>Install</b> on Android, or <b>Share → Add to Home Screen</b> on
                    iPhone.
                  </div>
                </div>
              </div>
            </div>
            <div className="relative mx-auto flex w-full max-w-md items-center justify-center py-4 lg:max-w-none">
              <PhoneFrame
                src="/screenshots/pay.png"
                alt="Agent Pay in the MyLiquid app: the agent's card and wallet"
                className="absolute left-0 top-10 hidden w-[38%] -rotate-6 sm:block"
              />
              <PhoneFrame
                src="/screenshots/home.png"
                alt="MyLiquid's Home on a phone: portfolio value, chart and the pet"
                className="relative z-10 w-[62%] sm:w-[44%]"
                featured
              />
              <PhoneFrame
                src="/screenshots/traders.png"
                alt="AI traders identified with AINRA, in the MyLiquid app"
                className="absolute right-0 top-10 hidden w-[38%] rotate-6 sm:block"
              />
            </div>
          </div>
        </section>

        {/* The desk */}
        <section id="desk" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24">
          <SectionHead kicker="The desk" title="Your agent runs a desk.">
            Separated duties, like a well-run fund: the agents that propose trades never value the
            book or police risk. Powered by Claude, with a deterministic offline mode.
          </SectionHead>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-5">
            {DESK_AGENTS.map((id) => {
              const a = AGENTS[id];
              return (
                <div
                  key={id}
                  className="reveal min-w-0 rounded-card border border-line-strong bg-surface p-4"
                >
                  <AgentAvatar agent={id} size="lg" />
                  <h3 className="type-title mt-3 text-fg">{a.name}</h3>
                  <div className="text-xs text-muted">{a.role}</div>
                  <p className="mt-2 text-sm text-fg-2">{a.summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why */}
        <section id="why" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24">
          <SectionHead kicker="Why" title="Built against the shadow&#8209;banking playbook.">
            Funds that sold &ldquo;liquid&rdquo; products, bought bespoke bonds from one originator
            and marked them themselves ended with gates and losses. MyLiquid inverts every step.
          </SectionHead>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-3">
            {LESSONS.map((l) => (
              <div
                key={l.bad}
                className="reveal rounded-card border border-line-strong bg-surface p-5"
              >
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

        {/* Early access: the waitlist doubles as audience research (docs/discovery). */}
        <section
          id="early-access"
          className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="reveal grid gap-6 rounded-card border border-line-strong bg-surface p-5 sm:gap-10 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Kicker className="text-accent">Early access</Kicker>
              <h2 className="type-h2 mt-2 text-fg">Get early access.</h2>
              <p className="mt-4 text-fg-2">
                MyLiquid runs on demo money today. Tell us what you&apos;d trust an agent with, and
                you help decide what we build first. Real-money accounts come later, through
                licensed partners.
              </p>
            </div>
            <WaitlistForm />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <div className="reveal grid items-center gap-8 rounded-card border-2 border-fg bg-accent-2 p-6 shadow-[5px_5px_0_var(--fg)] sm:gap-10 sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="type-h2 text-accent-2-ink">Your agent is ready to hatch.</h2>
              <p className="mt-4 max-w-[52ch] text-accent-2-ink/80">
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
                  className="flex h-24 w-24 items-end justify-center rounded-[10px] border-2 border-fg bg-lcd p-1"
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

      <footer className="border-t border-line-strong">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:px-6">
          <Logo size="sm" />
          <span>
            © {new Date().getFullYear()} MyLiquid. A demo platform. {marketsNote()}; fictional
            products and merchants. Not investment advice.
          </span>
          <span className="flex items-center gap-3">
            <Link href="/business" className="hover:text-fg">
              MyLiquid Gate for business
            </Link>
            <Link href="/ainra" className="hover:text-fg">
              AINRA agent identity
            </Link>
            <Link href="/terminal" className="hover:text-fg">
              Merchant terminal
            </Link>
            <Link href="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Plug className="h-3 w-3" aria-hidden />
            <span>Agents powered by Claude</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
