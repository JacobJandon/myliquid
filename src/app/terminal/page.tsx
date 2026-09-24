import Link from "next/link";
import { MERCHANTS } from "@/lib/domain/payments";
import { Logo } from "@/components/brand/Logo";
import { PosTerminal } from "@/components/pay/PosTerminal";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Merchant terminal" };

/** Public demo of a merchant's point-of-sale terminal that accepts payments from customers' agents. */
export default function TerminalPage() {
  return (
    <div className="bg-glow min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/app/pay" className={buttonClass("primary", "sm")}>
          Open Agent Pay
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-fg bg-accent-2 px-3 py-1 font-pixel text-[11px] uppercase">
            Merchant demo
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[1.02] text-fg sm:text-6xl">
            A till that takes payments from agents.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-fg-2">
            Ring up a sale, then pay it from a MyLiquid account. Open <b>Agent Pay → Tap to pay</b>,
            or tell your agent <em>&ldquo;pay LQ-XXXX&rdquo;</em>. The customer&apos;s agent card
            policy decides in milliseconds: approve, ask its owner, or decline.
          </p>
          <ol className="mt-6 space-y-2 text-sm text-fg-2">
            <li>
              <b className="text-fg">1.</b> Pick a merchant and amount, then press Charge.
            </li>
            <li>
              <b className="text-fg">2.</b> The terminal shows a short code (a stand-in for NFC).
            </li>
            <li>
              <b className="text-fg">3.</b> The customer&apos;s agent taps. Coffee under the
              auto-pay limit goes straight through, a $129 gadget waits for the owner, and the
              casino is declined.
            </li>
          </ol>
          <p className="mt-6 text-[11px] text-muted">
            Demo only: simulated merchants and demo money. Nothing real is charged.
          </p>
        </div>
        <PosTerminal merchants={MERCHANTS} />
      </main>
    </div>
  );
}
