import { Smartphone } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { buttonClass } from "@/components/ui";
import { EXPO_GO_APP_STORE, expoGoLink } from "@/lib/mobile/expoGo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open in Expo Go", robots: { index: false } };

/** One tap from a link (the "iPhone test (Expo Go)" workflow) into the iPhone app running in Expo Go. */
export default async function ExpoGoPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const link = expoGoLink((await searchParams).u);
  if (!link)
    return (
      <AuthShell
        title="Link expired"
        subtitle="Start a new test from GitHub: Actions → iPhone test (Expo Go)."
      >
        <p className="text-sm text-fg-2">This page only opens MyLiquid test links in Expo Go.</p>
      </AuthShell>
    );
  return (
    <AuthShell title="MyLiquid on your iPhone" subtitle="Opens the test app in Expo Go.">
      <div className="space-y-4">
        <a href={link} className={buttonClass("primary") + " w-full"}>
          <Smartphone className="h-4 w-4" aria-hidden /> Open in Expo Go
        </a>
        <p className="text-sm text-fg-2">
          Nothing happens? Install{" "}
          <a
            href={EXPO_GO_APP_STORE}
            className="font-medium text-accent underline underline-offset-2"
          >
            Expo Go from the App Store
          </a>{" "}
          (free), then come back and tap the button again.
        </p>
        <p className="break-all font-mono text-[11px] text-muted">{link}</p>
      </div>
      {/* Tries to open Expo Go straight away; the button stays for when the browser asks first. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){location.href=${JSON.stringify(link)}},400)`,
        }}
      />
    </AuthShell>
  );
}
