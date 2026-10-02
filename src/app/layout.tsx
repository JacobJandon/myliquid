import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Silkscreen } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/InstallApp";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Inter_Tight({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
});
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel-face",
});

export const metadata: Metadata = {
  title: { default: "MyLiquid: adopt an agent for your money", template: "%s · MyLiquid" },
  applicationName: "MyLiquid",
  appleWebApp: { capable: true, title: "MyLiquid", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  description:
    "Every MyLiquid account comes with a living AI agent. It invests across index funds, bitcoin and private markets, pays at the till with its own agent card, and always tells you how liquid you really are.",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
  // Lets the installed app reach the screen edges; layouts pad with env(safe-area-inset-*).
  viewportFit: "cover",
};

/** Keeps Chrome's install prompt until the app offers it (`components/pwa/InstallApp.tsx`). */
const INSTALL_PROMPT_SCRIPT =
  "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__mlInstallPrompt=e;window.dispatchEvent(new Event('ml-installable'))});";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${pixel.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
