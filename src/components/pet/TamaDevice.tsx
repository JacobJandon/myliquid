import clsx from "clsx";
import { PET_COLORS, hearts, type Mood, type PetColor, type Stage } from "@/lib/domain/companion";
import { PixelPet } from "./PixelPet";

/** Something that just happened, played as a short animation on the LCD. */
export type LcdEventKind = "eat" | "play" | "levelup" | "evolve" | "hello" | "pay";

export interface LcdEvent {
  kind: LcdEventKind;
  /** Changes on every event so the animation restarts. */
  id: number;
}

/** What the stats screen shows, like a real Tamagotchi's status pages. */
export interface LcdStats {
  ageDays: number;
  fullness: number;
  joy: number;
  energy: number;
  health: number;
  liquidPct: number;
}

// 1-bit sprites for the LCD (X = ink).
const ICONS = {
  food: ["...X...", "..XXX..", ".XX.XX.", "XX...XX", "XXXXXXX", "X.XXX.X", "XXXXXXX"],
  ball: [".XXX.", "X.X.X", "XXXXX", "X.X.X", ".XXX."],
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  heartEmpty: [".XX.XX.", "X..X..X", "X.....X", ".X...X.", "..X.X..", "...X..."],
  star: ["..X..", "..X..", "XXXXX", "..X..", "..X.."],
  coin: [".XXXX.", "X.XX.X", "X.X..X", "X..X.X", "X.XX.X", ".XXXX."],
} as const;

function LcdIcon({
  icon,
  size,
  className,
  style,
}: {
  icon: keyof typeof ICONS;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const rows = ICONS[icon];
  const w = rows[0]!.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${rows.length}`}
      width={size}
      height={(size * rows.length) / w}
      shapeRendering="crispEdges"
      className={clsx("pixelated", className)}
      style={style}
      aria-hidden
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "X" ? (
            <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="var(--lcd-ink)" />
          ) : null,
        ),
      )}
    </svg>
  );
}

const BANNER: Record<LcdEventKind, string> = {
  eat: "YUM!",
  play: "PLAY!",
  levelup: "LV UP!",
  evolve: "EVOLVED!",
  hello: "HI!",
  pay: "PAID!",
};

/** The short animation for an event, drawn over the pet. */
function EventOverlay({ event, screen }: { event: LcdEvent; screen: number }) {
  const icon = screen * 0.16;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="lcd-banner absolute left-1/2 top-[20%] -translate-x-1/2 whitespace-nowrap bg-lcd-ink px-1 leading-none text-lcd"
        style={{ fontSize: screen * 0.075, paddingTop: 2, paddingBottom: 2 }}
      >
        {BANNER[event.kind]}
      </div>
      {event.kind === "eat" && (
        <LcdIcon
          icon="food"
          size={icon}
          className="lcd-bite absolute"
          style={{ left: "12%", bottom: "24%" }}
        />
      )}
      {event.kind === "play" && (
        <LcdIcon
          icon="ball"
          size={icon * 0.75}
          className="lcd-ball absolute"
          style={{ bottom: "24%" }}
        />
      )}
      {event.kind === "hello" && (
        <LcdIcon icon="heart" size={icon} className="lcd-pop absolute left-[58%] top-[34%]" />
      )}
      {event.kind === "pay" && (
        <LcdIcon icon="coin" size={icon} className="lcd-pop absolute left-[60%] top-[34%]" />
      )}
      {(event.kind === "levelup" || event.kind === "evolve") && (
        <>
          <LcdIcon
            icon="star"
            size={icon * 0.7}
            className="lcd-twinkle absolute left-[12%] top-[38%]"
          />
          <LcdIcon
            icon="star"
            size={icon * 0.7}
            className="lcd-twinkle absolute right-[12%] top-[46%]"
            style={{ animationDelay: "0.25s" }}
          />
          <LcdIcon
            icon="star"
            size={icon * 0.55}
            className="lcd-twinkle absolute left-[22%] bottom-[22%]"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}
    </div>
  );
}

/** Tamagotchi-style status page: age, hearts and the money number that matters most. */
function StatsScreen({ stats, screen }: { stats: LcdStats; screen: number }) {
  const heart = screen * 0.075;
  const rows: [string, number][] = [
    ["HUNGRY", hearts(stats.fullness)],
    ["HAPPY", hearts(stats.joy)],
    ["ENERGY", hearts(stats.energy)],
    ["HEALTH", hearts(stats.health)],
  ];
  return (
    <div
      className="flex w-full flex-1 flex-col justify-center gap-[6%] leading-none"
      style={{ fontSize: screen * 0.068 }}
    >
      <div className="flex justify-between">
        <span>AGE</span>
        <span>{stats.ageDays}D</span>
      </div>
      {rows.map(([label, filled]) => (
        <div key={label} className="flex items-center justify-between">
          <span>{label}</span>
          <span className="flex gap-[2px]" aria-label={`${label.toLowerCase()} ${filled} of 4`}>
            {[0, 1, 2, 3].map((i) => (
              <LcdIcon key={i} icon={i < filled ? "heart" : "heartEmpty"} size={heart} />
            ))}
          </span>
        </div>
      ))}
      <div className="flex justify-between">
        <span>7D CASH</span>
        <span>{Math.round(stats.liquidPct * 100)}%</span>
      </div>
    </div>
  );
}

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
  event,
  screenMode = "pet",
  stats,
  onScreenClick,
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
  event?: LcdEvent | null;
  screenMode?: "pet" | "stats";
  stats?: LcdStats;
  onScreenClick?: () => void;
}) {
  const showStats = screenMode === "stats" && !!stats;
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
            className={clsx(
              "relative flex flex-col items-center justify-between overflow-hidden rounded-[18%] bg-lcd font-pixel text-lcd-ink",
              event?.kind === "evolve" && "lcd-flash",
              onScreenClick && "cursor-pointer",
            )}
            style={{
              width: screen,
              height: screen,
              padding: screen * 0.06,
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)",
            }}
            {...(onScreenClick
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": showStats ? `Show ${name}` : `Show ${name}'s stats`,
                  onClick: onScreenClick,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onScreenClick();
                    }
                  },
                }
              : {})}
          >
            <div
              className="flex w-full items-center justify-between leading-none"
              style={{ fontSize: screen * 0.075 }}
            >
              <span>LV{level}</span>
              <span className="uppercase">{showStats ? "STATS" : mood}</span>
            </div>
            {showStats ? (
              <StatsScreen stats={stats!} screen={screen} />
            ) : (
              <div
                key={`pet-${event?.id ?? "idle"}`}
                className={clsx(
                  event?.kind === "eat" && "lcd-chomp",
                  event?.kind === "play" && "pet-wiggle",
                  (event?.kind === "levelup" || event?.kind === "evolve") && "pet-bounce",
                )}
              >
                <PixelPet
                  stage={stage}
                  mood={mood}
                  color={color}
                  lcd
                  size={screen * 0.66}
                  animate={animate}
                  title={`${name}, feeling ${mood}`}
                />
              </div>
            )}
            {event && !showStats && (
              <EventOverlay key={`fx-${event.id}`} event={event} screen={screen} />
            )}
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
