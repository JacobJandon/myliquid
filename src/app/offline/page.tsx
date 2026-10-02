import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Offline" };

/** What the installed app shows without a connection (served by the service worker, `public/sw.js`). */
export default function OfflinePage() {
  return (
    <div className="bg-glow flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <div className="mt-10 grid h-14 w-14 place-items-center rounded-2xl border-2 border-fg bg-surface shadow-[4px_4px_0_#111]">
        <WifiOff className="h-6 w-6 text-fg" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-3xl text-fg">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-2">
        MyLiquid only shows live balances, so it needs a connection. Your agents keep to your rules
        while you&apos;re away.
      </p>
      <a href="/app" className={buttonClass("primary") + " mt-6"}>
        Try again
      </a>
    </div>
  );
}
