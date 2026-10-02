import type { MetadataRoute } from "next";

/**
 * The web app manifest: what makes MyLiquid installable as an app on Android (Chrome's "Install app"), on
 * iPhone (Add to Home Screen) and on desktop, and what the Android wrapper (`android/`) is generated from.
 */
export default function manifest(): MetadataRoute.Manifest {
  const icon = [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }];
  return {
    id: "/app",
    name: "MyLiquid",
    short_name: "MyLiquid",
    description:
      "Your living AI agent for money: it invests, pays at the till with its own card, and tells you how liquid you really are.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ee",
    theme_color: "#f5f3ee",
    categories: ["finance", "productivity"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Invest", url: "/app/invest", icons: icon },
      { name: "Agent Pay", short_name: "Pay", url: "/app/pay", icons: icon },
      { name: "Talk to your agent", short_name: "Talk", url: "/app/copilot", icons: icon },
      { name: "Activity", url: "/app/activity", icons: icon },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Your portfolio and your pet",
      },
      {
        src: "/screenshots/pay.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Agent Pay: your agent's own card",
      },
      {
        src: "/screenshots/traders.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "AI traders identified with AINRA",
      },
    ],
  };
}
