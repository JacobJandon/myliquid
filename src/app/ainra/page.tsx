import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AinraInspector } from "@/components/ainra/AinraInspector";
import { AinraInterestForm } from "@/components/research/Research";
import { buttonClass } from "@/components/ui";
import { ainraMode, ainraModeLabel, scopesForTier } from "@/lib/ainra";
import { TAMPERS } from "@/lib/ainra/inspect";
import { registrarEnabled, registrarHealth } from "@/lib/ainra/registrar";
import { TIER_AUTO_CEILING_CENTS } from "@/lib/domain/agentTrading";
import { formatUsd } from "@/lib/domain/money";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "AINRA in MyLiquid",
  description:
    "How MyLiquid verifies AI agents with AINRA passports: the chain of trust, a live tamper lab on real passports, and what identity lets an agent do.",
};

const SOURCE =
  "https://github.com/JacobJandon/myliquid/blob/claude/myliquid-fintech-ai-agents-1svwct";
const AINRA = "https://github.com/JacobJandon/ainra";

const CHAIN = [
  {
    title: "AINRA root",
    text: "Two root keys, Ed25519 and SLH-DSA (hash-based, post-quantum). Here, AINRA's TEST-ROOT.",
    tag: "roots.json",
  },
  {
    title: "Registrar directory",
    text: "Root-signed list of accredited registrars and their keys. Distrust one and its passports stop verifying.",
    tag: "directory.json",
  },
  {
    title: "Passport",
    text: "A registrar vouches for an agent: its AINRA Number, tier, capabilities and who it answers to. Signed twice: Ed25519 + ML-DSA-65.",
    tag: "agent-*.json",
  },
  {
    title: "Log and status",
    text: "Every passport sits in the registrar's public Merkle log, and carries a signed revocation status at most 5 minutes old.",
    tag: "inclusion proof · status list",
  },
  {
    title: "MyLiquid verifies",
    text: "Locally, with @ainra/sdk, against the anchors it trusts. Nothing is sent to AINRA. Anything short of valid is refused.",
    tag: "checkPassport()",
  },
];

const USES = [
  {
    title: "Connect an outside agent",
    where: "/app/connect · src/lib/services/agentInvites.ts",
    text: "An investor invites an agent; it enrolls by presenting its passport, and the API key is pinned to its permanent AINRA Number. Another agent can't use that key.",
  },
  {
    title: "Every MCP request",
    where: "/api/agent-identity → /api/mcp · identityGate",
    text: "The agent presents its passport (in the body, or the x-ainra-passport header); a pinned key then acts only while that presentation is under 5 minutes old. Its scopes narrow to what the passport declares and its tier allows.",
  },
  {
    title: "Trading on its own",
    where: "autonomyDecision · src/lib/domain/agentTrading.ts",
    text: "Only an identified L2+ agent that declares myliquid:trade trades without asking, and only within the investor's limits and its tier's ceiling. Everyone else proposes.",
  },
  {
    title: "Hosted AI traders",
    where: "src/lib/services/hostedTraders.ts",
    text: "MyLiquid's own traders get no shortcut: each run presents its passport and goes through the same gate and MCP tools. With a live registrar they get real passports, revocable from the Traders page.",
  },
  {
    title: "Paid data (x402)",
    where: "/api/x402/research/[productId] · identityGate",
    text: "Agents buying data from the wallet are identity-gated the same way before a cent moves.",
  },
  {
    title: "MyLiquid Gate, for businesses",
    where: "/business · src/lib/gate",
    text: "The same verification as an API: identity comes only from a verified passport, never from what the caller says.",
  },
];

const CODE = [
  [
    "src/lib/ainra/index.ts",
    "Trust anchors, checkPassport (fail closed), tier and capability rules",
  ],
  ["src/lib/ainra/inspect.ts", "This page's lab: decode, tamper, verify, explain"],
  ["src/lib/ainra/registrar.ts", "A live AINRA registrar: issue, present, revoke"],
  ["src/lib/services/agentInvites.ts", "Agents enroll with their passport; the key is pinned"],
  ["src/lib/services/agentIdentity.ts", "Presentations, the 5-minute window, identityGate"],
  ["src/lib/domain/agentTrading.ts", "What identity lets an outside trader do (pure)"],
  ["src/lib/gate/identity.ts", "Gate's identity: only from a verified passport"],
  ["src/lib/ainra/testbed/README.md", "The TEST-ROOT passports, minted with AINRA's registrar"],
  ["docs/AINRA-LIVE.md", "Run a live registrar and issue real identities"],
];

/** Public: how MyLiquid implements AINRA, with the real verifier in a tamper lab. */
export default async function AinraPage() {
  const mode = ainraMode();
  const live = registrarEnabled() ? await registrarHealth() : null;
  const tiers = ["L1", "L2", "L3", "L4"].map((t) => ({
    tier: t,
    scopes: scopesForTier(t),
    ceiling: TIER_AUTO_CEILING_CENTS[t] ?? 0,
  }));

  return (
    <div className="bg-glow min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/business" className={buttonClass("ghost", "sm")}>
            For business
          </Link>
          <a href="#lab" className={buttonClass("primary", "sm")}>
            Try the lab <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:pt-14">
          <div className="font-pixel text-[10px] uppercase text-accent">
            AINRA · agent identity, inside MyLiquid
          </div>
          <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[1.02] text-fg sm:text-6xl">
            Before an AI agent touches money, MyLiquid checks its passport.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-fg-2">
            <a href={AINRA} className="underline underline-offset-2">
              AINRA
            </a>{" "}
            gives AI agents passports: a registrar vouches for who runs the agent and what it may
            do, and anyone can verify that offline. MyLiquid verifies every agent that wants to act
            on an investor&apos;s account, and identity decides how far it may go on its own.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span
              className="rounded-full border border-fg bg-accent-2 px-3 py-1 font-semibold text-accent-2-ink"
              data-ainra-mode={mode}
            >
              {ainraModeLabel()}
            </span>
            {live && (
              <span className="rounded-full border border-line-strong bg-surface px-3 py-1 text-fg">
                Live registrar{" "}
                {live.ok ? `${live.registrar} · ${live.records} identities` : "unreachable"}
              </span>
            )}
            <span className="text-muted">
              {mode === "testbed"
                ? "Real cryptography on AINRA's TEST-ROOT, verified at the passports' pinned time."
                : "Verified at the real time against the configured roots."}
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="chain">
          <h2 id="chain" className="font-display text-3xl text-fg sm:text-4xl">
            The chain of trust
          </h2>
          <ol className="mt-6 grid gap-3 lg:grid-cols-5">
            {CHAIN.map((c, i) => (
              <li key={c.title} className="relative min-w-0">
                <div className="h-full rounded-2xl border-2 border-fg bg-surface p-4 shadow-[3px_3px_0_#111]">
                  <div className="font-pixel text-[10px] uppercase text-muted">Step {i + 1}</div>
                  <h3 className="mt-1 font-semibold text-fg">{c.title}</h3>
                  <p className="mt-1 text-sm text-fg-2">{c.text}</p>
                  <code className="mt-3 inline-block rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-2">
                    {c.tag}
                  </code>
                </div>
                {i < CHAIN.length - 1 && (
                  <ArrowDown className="mx-auto my-1 h-4 w-4 text-muted lg:hidden" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </section>

        <section id="lab" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6">
          <h2 className="font-display text-4xl text-fg sm:text-5xl">Try to fool it.</h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            Pick a real passport, then alter a copy the way a dishonest or careless agent might.
            Each result is MyLiquid&apos;s own verifier running now, the same check every agent
            request goes through.
          </p>
          <div className="mt-8">
            <AinraInspector
              testbed={mode === "testbed"}
              tampers={TAMPERS.map((t) => ({
                id: t.id,
                label: t.label,
                why: "why" in t ? t.why : undefined,
              }))}
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="tiers">
          <h2 id="tiers" className="font-display text-3xl text-fg sm:text-4xl">
            Identity decides autonomy
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            A verified agent gets at most what its tier allows and its passport declares. On top of
            that the investor sets its limits, and every order still passes the mandate and
            Sentinel&apos;s checks. An unverified agent only ever proposes.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">AINRA tier</th>
                  <th className="px-4 py-2 font-medium">May use</th>
                  <th className="px-4 py-2 font-medium">Trades on its own, per order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tiers.map((t) => (
                  <tr key={t.tier}>
                    <td className="px-4 py-2 font-semibold text-fg">{t.tier}</td>
                    <td className="px-4 py-2 text-fg-2">{t.scopes.join(", ")}</td>
                    <td className="px-4 py-2 text-fg-2">
                      {t.ceiling ? `up to ${formatUsd(t.ceiling)}` : "never: proposes"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 font-semibold text-fg">No valid passport</td>
                  <td className="px-4 py-2 text-fg-2">its key&apos;s scopes, proposals only</td>
                  <td className="px-4 py-2 text-fg-2">never: proposes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="uses">
          <h2 id="uses" className="font-display text-3xl text-fg sm:text-4xl">
            Where MyLiquid uses it
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USES.map((u) => (
              <li key={u.title} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
                <h3 className="font-semibold text-fg">{u.title}</h3>
                <p className="mt-1 text-sm text-fg-2">{u.text}</p>
                <code className="mt-3 block break-words font-mono text-[11px] text-muted">
                  {u.where}
                </code>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app/connect" className={buttonClass("primary")}>
              Test-drive an agent trader
            </Link>
            <Link href="/business#try" className={buttonClass("secondary")}>
              Try Gate
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="interest">
          <div className="grid gap-8 rounded-[2rem] border border-line-strong bg-surface p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="interest" className="font-display text-3xl text-fg sm:text-4xl">
                Want this for your agents?
              </h2>
              <p className="mt-3 text-fg-2">
                Whether you build agents, run a platform they connect to, or would issue passports
                yourself, tell us what you need. It shapes what AINRA and MyLiquid build next.
              </p>
            </div>
            <AinraInterestForm />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="code">
          <h2 id="code" className="font-display text-3xl text-fg sm:text-4xl">
            Read the code
          </h2>
          <p className="mt-3 max-w-2xl text-fg-2">
            MyLiquid is open source. Run your own AINRA registrar and give agents real, revocable
            identities with <code className="font-mono text-sm">scripts/ainra-live.sh</code>.
          </p>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
            {CODE.map(([path, what]) => (
              <li
                key={path}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
              >
                <a
                  href={`${SOURCE}/${path}`}
                  className="break-all font-mono text-xs text-accent underline-offset-2 hover:underline"
                >
                  {path}
                </a>
                <span className="text-sm text-fg-2">{what}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-muted sm:px-6">
        AINRA is an open standard (Apache-2.0 OR MIT). The testbed passports are AINRA TEST-ROOT
        artifacts for fictional operators; AINRA&apos;s production root doesn&apos;t exist until its
        genesis ceremony.
      </footer>
    </div>
  );
}
