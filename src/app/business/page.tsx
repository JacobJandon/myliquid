import clsx from "clsx";
import Link from "next/link";
import { ArrowRight, Fingerprint, Gauge, OctagonX, ScrollText, UserCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GatePlayground } from "@/components/gate/GatePlayground";
import { DesignPartnerForm } from "@/components/research/Research";
import { buttonClass } from "@/components/ui";

export const metadata = {
  title: "MyLiquid Gate for business",
  description:
    "The runtime check between AI agents and your customers' money: identity, limits, review and a kill switch, with evidence for every decision.",
};

const PILLARS = [
  {
    icon: Fingerprint,
    title: "Knows who the agent is",
    text: "Only agents with a valid AINRA passport may act on their own, never above their tier's ceiling and only for what their passport declares.",
  },
  {
    icon: Gauge,
    title: "Applies your limits",
    text: "Per-action and daily limits, allowed instruments, blocked merchant categories and a rate limit, checked before anything executes.",
  },
  {
    icon: UserCheck,
    title: "Asks a person when in doubt",
    text: "Anything not plainly fine goes to review instead of through. Unidentified agents only ever propose.",
  },
  {
    icon: OctagonX,
    title: "Stops everything at once",
    text: "One kill switch halts every agent. A revoked passport is refused on the next request.",
  },
  {
    icon: ScrollText,
    title: "Keeps the evidence",
    text: "Every decision lists each check and carries a SHA-256 fingerprint, so your records show if anything was changed.",
  },
];

const PLANS = [
  {
    name: "Developer",
    price: "Free",
    text: "10,000 decisions a month, the sandbox, community support.",
  },
  {
    name: "Growth",
    price: "$1,500 / month",
    text: "1M decisions, every identity adapter, evidence export, kill-switch API.",
  },
  {
    name: "Enterprise",
    price: "From $60k / year",
    text: "Volume pricing, private cloud, SSO, SLA and our SOC 2 report.",
  },
];

const CURL = `curl -X POST https://<your-myliquid>/api/gate/v1/decide \\
  -H 'content-type: application/json' \\
  -d '{
    "action": { "kind": "trade", "amountCents": 150000, "side": "buy", "instrument": "MLUS" },
    "agent":  { "id": "northwind-momentum", "passport": <the agent's AINRA presentation> },
    "policy": { "mode": "auto", "perActionLimitCents": 200000, "dailyLimitCents": 500000 }
  }'`;

/** MyLiquid Gate, the B2B product (docs/startup/plan.md, P1): what it does, a live playground, the API, pricing. */
export default function BusinessPage() {
  return (
    <div className="bg-glow min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className={buttonClass("ghost", "sm")}>
            For investors
          </Link>
          <Link href="/ainra" className={clsx(buttonClass("ghost", "sm"), "hidden sm:inline-flex")}>
            Agent identity
          </Link>
          <a href="#try" className={buttonClass("primary", "sm")}>
            Try Gate <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:pt-14">
          <div className="font-pixel text-[10px] uppercase text-accent">
            MyLiquid Gate · for brokers and fintechs
          </div>
          <h1 className="mt-3 max-w-4xl font-display text-4xl leading-[1.05] text-fg sm:text-5xl lg:text-6xl">
            Let AI agents trade and pay for your customers, safely.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-fg-2 sm:text-lg">
            Gate sits between the agents and your systems. For every action it checks who the agent
            is, what the customer and your firm allow, and decides: go ahead, ask a person, or stop.
            One API call, with the evidence a supervisor will ask for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#try" className={buttonClass("primary")}>
              Try it below
            </a>
            <a href="#api" className={buttonClass("secondary")}>
              See the API
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-label="What Gate does">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-fg bg-accent-2 text-accent-2-ink">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="mt-3 text-sm font-semibold text-fg">{title}</h2>
                <p className="mt-1 text-sm text-fg-2">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="try" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-10 sm:py-14 sm:px-6">
          <h2 className="font-display text-3xl leading-tight text-fg sm:text-4xl lg:text-5xl">
            Try a decision.
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            These are real AINRA passports from the testbed, verified here as they would be in
            production. Change anything and Gate decides again.{" "}
            <Link href="/ainra#lab" className="text-accent underline underline-offset-2">
              See how the passports are checked
            </Link>
            .
          </p>
          <div className="mt-8">
            <GatePlayground />
          </div>
        </section>

        <section id="api" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-10 sm:py-14 sm:px-6">
          <h2 className="font-display text-3xl leading-tight text-fg sm:text-4xl lg:text-5xl">
            One call.
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            Send the action, the agent&apos;s passport as it presented it, and your policy. Gate
            answers <code className="font-mono text-sm">allow</code>,{" "}
            <code className="font-mono text-sm">review</code> or{" "}
            <code className="font-mono text-sm">block</code>, with every check and the evidence
            hashes. It stores nothing and moves no money; you keep the decision with your records.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border-2 border-fg bg-fg p-5 font-mono text-xs leading-relaxed text-bg shadow-[4px_4px_0_#111]">
            {CURL}
          </pre>
        </section>

        <section
          id="design-partners"
          className="mx-auto max-w-6xl scroll-mt-6 px-4 py-10 sm:py-14 sm:px-6"
          aria-labelledby="partners"
        >
          <div className="grid gap-10 rounded-[2rem] border-2 border-fg bg-surface p-6 shadow-[6px_6px_0_#111] sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2
                id="partners"
                className="font-display text-3xl leading-tight text-fg sm:text-4xl lg:text-5xl"
              >
                Become a design partner.
              </h2>
              <p className="mt-3 text-fg-2">
                Five firms get Gate free for six months, shaped around their agents and their
                regulator, in exchange for a weekly call and honest feedback.
              </p>
            </div>
            <DesignPartnerForm />
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-10 sm:py-14 sm:px-6"
          aria-labelledby="pricing"
        >
          <h2
            id="pricing"
            className="font-display text-3xl leading-tight text-fg sm:text-4xl lg:text-5xl"
          >
            Pricing
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            Priced on decisions: every trade or payment Gate checks. Reads are free. Design partners
            use it free for six months.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-sm text-fg-2">{p.name}</div>
                <div className="mt-1 font-display text-2xl text-fg">{p.price}</div>
                <p className="mt-2 text-sm text-fg-2">{p.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-muted sm:px-6">
        MyLiquid Gate is in early access. The playground runs on AINRA&apos;s testbed (TEST-ROOT)
        and demo policies; it moves no money.
      </footer>
    </div>
  );
}
