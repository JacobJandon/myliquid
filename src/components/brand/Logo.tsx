import clsx from "clsx";
import { PixelPet } from "@/components/pet/PixelPet";

/** Wordmark: a tiny pixel Liquid next to "MyLiquid". */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? 34 : size === "sm" ? 22 : 28;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-fg", className)}>
      <span
        className="flex items-center justify-center rounded-[10px] border-2 border-fg bg-accent-2"
        style={{ width: px + 6, height: px + 6 }}
      >
        <PixelPet
          stage="droplet"
          mood="happy"
          color="blue"
          size={px}
          animate={false}
          title="MyLiquid"
        />
      </span>
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
