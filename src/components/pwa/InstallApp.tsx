"use client";

import clsx from "clsx";
import { Download, Share, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/LogoMark";
import { buttonClass } from "@/components/ui";

/**
 * Installing MyLiquid as an app. Chrome (Android, desktop) offers a `beforeinstallprompt` event, caught early by
 * the inline script in the root layout; iPhone and iPad install through Share → Add to Home Screen.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __mlInstallPrompt?: InstallPromptEvent | null;
  }
}

export type InstallState = "installed" | "prompt" | "ios" | "unavailable";

function subscribe(onChange: () => void) {
  window.addEventListener("ml-installable", onChange);
  window.addEventListener("appinstalled", onChange);
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("ml-installable", onChange);
    window.removeEventListener("appinstalled", onChange);
    standalone.removeEventListener("change", onChange);
  };
}

function snapshot(): InstallState {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "installed";
  if (window.__mlInstallPrompt) return "prompt";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "unavailable";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => "unavailable");
}

async function install() {
  const event = window.__mlInstallPrompt;
  if (!event) return;
  window.__mlInstallPrompt = null;
  await event.prompt();
  await event.userChoice.catch(() => undefined);
  window.dispatchEvent(new Event("ml-installable"));
}

/** Registers the service worker (production builds only: in development it would cache stale chunks). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}

/** A row for menus: "Install the app", or how to on iPhone. Nothing once installed or where it can't be. */
export function InstallAppRow({ className }: { className?: string }) {
  const state = useInstallState();
  if (state === "prompt")
    return (
      <button
        type="button"
        onClick={install}
        className={clsx("flex w-full items-center gap-3 text-left", className)}
      >
        <Download className="h-4 w-4" aria-hidden /> Install the app
      </button>
    );
  if (state === "ios")
    return (
      <p className={clsx("flex items-center gap-3 text-fg-2", className)}>
        <Share className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Install: tap <b>Share</b>, then <b>Add to Home Screen</b>.
        </span>
      </p>
    );
  return null;
}

const DISMISSED = "ml-install-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

function onDismissedChange(onChange: () => void) {
  window.addEventListener("ml-install-dismissed", onChange);
  return () => window.removeEventListener("ml-install-dismissed", onChange);
}

/** A card on the phone Home screen until the app is installed or the card is dismissed. */
export function InstallBanner() {
  const state = useInstallState();
  const dismissed = useSyncExternalStore(onDismissedChange, readDismissed, () => true);
  if (dismissed || (state !== "prompt" && state !== "ios")) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED, "1");
    } catch {
      /* private mode: it comes back next time */
    }
    window.dispatchEvent(new Event("ml-install-dismissed"));
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-fg bg-surface p-3 shadow-[3px_3px_0_#111] lg:hidden">
      <LogoMark size={36} animate={false} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-fg">Get the MyLiquid app</div>
        <div className="text-xs text-fg-2">
          {state === "prompt"
            ? "Free. On your home screen, full screen, no app store."
            : "Tap Share, then Add to Home Screen."}
        </div>
      </div>
      {state === "prompt" && (
        <button type="button" className={buttonClass("primary", "sm")} onClick={install}>
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
