import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Silkscreen } from "next/font/google";
import "./globals.css";

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
  description:
    "Every MyLiquid account comes with a living AI agent. It invests across index funds, bitcoin and private markets, pays at the till with its own agent card, and always tells you how liquid you really are.",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${pixel.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
