import clsx from "clsx";
import { LogoMark } from "./LogoMark";

/** Wordmark: the living MyLiquid drop next to "MyLiquid". */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? 34 : size === "sm" ? 22 : 28;
  return (
    <span className={clsx("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark size={px} />
      <span
        className={clsx(
          "font-display tracking-tight",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
        )}
      >
        MyLiquid
      </span>
    </span>
  );
}
