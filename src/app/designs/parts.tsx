import { linePath } from "./sample";

/** Frames and marks every design direction uses, so they differ only in design. */

export function BrowserFrame({
  children,
  url = "app.myliquid.com",
  className = "",
  bar = "#e9e7e1",
  dot = "rgba(0,0,0,0.18)",
  text = "rgba(0,0,0,0.45)",
}: {
  children: React.ReactNode;
  url?: string;
  className?: string;
  bar?: string;
  dot?: string;
  text?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: bar }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
        ))}
        <span className="ml-3 truncate font-mono text-[11px]" style={{ color: text }}>
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({
  children,
  className = "",
  bezel = "#111",
}: {
  children: React.ReactNode;
  className?: string;
  bezel?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[300px] shrink-0 rounded-[44px] p-[10px] ${className}`}
      style={{ background: bezel }}
    >
      <div className="relative h-[620px] overflow-hidden rounded-[34px]">
        <div
          className="absolute left-1/2 top-2 z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full"
          style={{ background: bezel }}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

export function LineChart({
  values,
  width = 600,
  height = 160,
  stroke,
  strokeWidth = 2,
  fill,
  grid,
  className = "",
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  stroke: string;
  strokeWidth?: number;
  /** A colour for the area under the line, faded to transparent. */
  fill?: string;
  grid?: string;
  className?: string;
}) {
  const d = linePath(values, width, height);
  const id = `g${stroke.replace(/[^a-z0-9]/gi, "")}${width}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {grid &&
        [0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={width}
            y1={height * f}
            y2={height * f}
            stroke={grid}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A tiny trend line for list rows. */
export function Spark({ up, color, down }: { up: boolean; color: string; down: string }) {
  const values = up ? [3, 4, 3.6, 4.4, 4.2, 5, 5.4] : [5, 4.6, 4.9, 4.2, 4.4, 3.8, 3.6];
  // A fixed-width box: the chart itself always fills its container's width.
  return (
    <span className="block w-14 shrink-0">
      <LineChart
        values={values}
        width={56}
        height={20}
        stroke={up ? color : down}
        strokeWidth={1.5}
        className="h-5"
      />
    </span>
  );
}

/**
 * A desktop screen shown at its real width (900 px) and scaled down to fit narrower viewports, like a picture of
 * it, instead of squashing its columns. Full size from lg up.
 */
export function ScaledDesktop({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[900px] max-w-none max-sm:[zoom:0.36] sm:max-md:[zoom:0.64] md:max-lg:[zoom:0.78] lg:w-auto lg:max-w-full">
      {children}
    </div>
  );
}
