import clsx from "clsx";

/**
 * The MyLiquid mark: a living drop of liquid with eyes. It slowly morphs,
 * breathes and blinks, and reflects the brand lime. Pure markup and CSS, so it
 * renders identically on the server and the client.
 */
export function LogoMark({
  size = 28,
  animate = true,
  aura = false,
  className,
  title = "MyLiquid",
}: {
  size?: number;
  animate?: boolean;
  aura?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={clsx("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
    >
      {aura && (
        <span
          className={clsx("absolute rounded-full", animate && "orb-aura")}
          style={{
            inset: "-24%",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 38%, transparent) 0%, transparent 66%)",
          }}
          aria-hidden
        />
      )}
      <span className={clsx("absolute inset-0", animate && "orb-breathe")}>
        <span
          className={clsx("absolute inset-0 overflow-hidden", animate && "orb-morph")}
          style={{
            borderRadius: "50%",
            background: [
              "radial-gradient(circle at 76% 80%, rgba(200,245,96,0.75) 0%, rgba(200,245,96,0) 34%)",
              "radial-gradient(circle at 32% 28%, #9fb6ff 0%, #2f5bff 46%, #13206e 100%)",
            ].join(", "),
            boxShadow: `inset ${-size * 0.05}px ${-size * 0.07}px ${size * 0.14}px rgba(8,10,40,0.3), 0 ${size * 0.06}px ${size * 0.16}px rgba(47,91,255,0.28)`,
          }}
        >
          {/* liquid swirl */}
          <span
            className={clsx(
              "absolute -inset-1/4 opacity-25 mix-blend-soft-light",
              animate && "orb-spin",
            )}
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 18%, rgba(255,255,255,0.9) 26%, transparent 36% 58%, rgba(255,255,255,0.7) 66%, transparent 76%)",
            }}
            aria-hidden
          />
          {/* highlight */}
          <span
            className="absolute rounded-full bg-white/60"
            style={{
              left: "17%",
              top: "11%",
              width: "32%",
              height: "20%",
              transform: "rotate(-24deg)",
              filter: `blur(${Math.max(0.6, size * 0.025)}px)`,
            }}
            aria-hidden
          />
          {/* eyes */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <g className={clsx(animate && "orb-blink")}>
              <rect x={31.5} y={38} width={10} height={18} rx={5} fill="#0d1024" />
              <rect x={58.5} y={38} width={10} height={18} rx={5} fill="#0d1024" />
            </g>
            <circle cx={38.5} cy={42.5} r={2} fill="white" opacity={0.9} />
            <circle cx={65.5} cy={42.5} r={2} fill="white" opacity={0.9} />
          </svg>
        </span>
      </span>
    </span>
  );
}
