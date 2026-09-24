import clsx from "clsx";
import { PET_COLORS, type Mood, type PetColor, type Stage } from "@/lib/domain/companion";
import { PixelPet } from "./PixelPet";

/**
 * The pet's home: an egg-shaped handheld with a monochrome LCD, in the pet's
 * color. Buttons are passed in so the app can wire them and the landing page can
 * show them static.
 */
export function TamaDevice({
  name,
  stage,
  mood,
  color,
  level,
  size = 280,
  buttons,
  className,
  animate = true,
}: {
  name: string;
  stage: Stage;
  mood: Mood;
  color: PetColor;
  level: number;
  size?: number;
  buttons?: React.ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const shell = PET_COLORS[color];
  const screen = size * 0.56;
  return (
    <div className={clsx("relative mx-auto select-none", className)} style={{ width: size }}>
      {/* key-ring loop */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full border-[6px]"
        style={{
          top: -size * 0.07,
          width: size * 0.16,
          height: size * 0.16,
          borderColor: "#1b1b1b",
        }}
        aria-hidden
      />
      <div
        className="relative flex flex-col items-center"
        style={{
          width: size,
          height: size * 1.12,
          borderRadius: "50% 50% 47% 47% / 56% 56% 44% 44%",
          background: `radial-gradient(circle at 32% 22%, color-mix(in srgb, ${shell} 55%, white) 0%, ${shell} 42%, color-mix(in srgb, ${shell} 70%, black) 100%)`,
          boxShadow: `inset 0 -${size * 0.03}px 0 rgba(0,0,0,0.18), inset 0 ${size * 0.02}px 0 rgba(255,255,255,0.35), 0 ${size * 0.05}px ${size * 0.08}px rgba(17,17,17,0.18), 0 0 0 3px #1b1b1b`,
        }}
      >
        {/* bezel + LCD */}
        <div
          className="mt-[18%] flex items-center justify-center rounded-[22%] bg-[#1b1b1b]"
          style={{ width: screen + size * 0.07, height: screen + size * 0.07 }}
        >
          <div
            className="relative flex flex-col items-center justify-between overflow-hidden rounded-[18%] bg-lcd font-pixel text-lcd-ink"
            style={{
              width: screen,
              height: screen,
              padding: screen * 0.06,
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            <div
              className="flex w-full items-center justify-between leading-none"
              style={{ fontSize: screen * 0.075 }}
            >
              <span>LV{level}</span>
              <span className="uppercase">{mood}</span>
            </div>
            <PixelPet
              stage={stage}
              mood={mood}
              color={color}
              lcd
              size={screen * 0.66}
              animate={animate}
              title={`${name}, feeling ${mood}`}
            />
            <div
              className="w-full truncate text-center uppercase leading-none"
              style={{ fontSize: screen * 0.085 }}
            >
              {name}
            </div>
            {/* scanlines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, #26301c 0px, #26301c 1px, transparent 1px, transparent 3px)",
              }}
              aria-hidden
            />
          </div>
        </div>
        <div
          className="mt-[7%] flex items-start justify-center gap-[9%]"
          style={{ width: size * 0.7 }}
        >
          {buttons ?? (
            <>
              <DeviceButton size={size} label="Feed" />
              <DeviceButton size={size} label="Play" />
              <DeviceButton size={size} label="Talk" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeviceButton({
  size,
  label,
  onClick,
  disabled,
  active,
}: {
  size: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const d = size * 0.13;
  const Tag = onClick ? "button" : "div";
  return (
    <div className="flex flex-col items-center gap-1">
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        disabled={onClick ? disabled : undefined}
        aria-label={label}
        className={clsx(
          "rounded-full border-[3px] border-[#1b1b1b] bg-[#f5f3ee] transition",
          onClick &&
            "cursor-pointer hover:brightness-95 active:translate-y-0.5 disabled:opacity-50",
          active && "bg-accent-2",
        )}
        style={{
          width: d,
          height: d,
          boxShadow: `inset 0 -${d * 0.12}px 0 rgba(0,0,0,0.15), 0 ${d * 0.08}px 0 #1b1b1b`,
        }}
      />
      <span
        className="font-pixel uppercase text-[#1b1b1b]"
        style={{ fontSize: Math.max(9, size * 0.038) }}
      >
        {label}
      </span>
    </div>
  );
}
