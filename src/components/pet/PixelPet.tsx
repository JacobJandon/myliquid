import clsx from "clsx";
import { PET_COLORS, type Mood, type PetColor, type Stage } from "@/lib/domain/companion";

/**
 * The pet, drawn procedurally as pixel art: a droplet whose size and details
 * change with its evolution stage and whose face and motion change with its mood.
 * Pure SVG (no hooks), so it renders on the server and the client.
 */

const GRID = 20;

type Px = [number, number];

interface Shape {
  cx: number;
  cy: number;
  r: number;
  tipY: number;
}

const SHAPES: Record<Stage, Shape> = {
  drop: { cx: 10, cy: 12.9, r: 5, tipY: 5.6 },
  droplet: { cx: 10, cy: 12.6, r: 5.4, tipY: 4.6 },
  splash: { cx: 10, cy: 12.5, r: 5.8, tipY: 4 },
  wave: { cx: 10, cy: 12.6, r: 6.2, tipY: 3.6 },
  tide: { cx: 10, cy: 12.8, r: 6.5, tipY: 3.4 },
};

function inside(s: Shape, x: number, y: number): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  if (Math.hypot(px - s.cx, py - s.cy) <= s.r) return true;
  if (py >= s.tipY && py <= s.cy) {
    const half = (s.r * (py - s.tipY)) / (s.cy - s.tipY);
    return Math.abs(px - s.cx) <= half * 0.96;
  }
  return false;
}

interface Palette {
  outline: string;
  body: string;
  shade: string;
  highlight: string;
  eye: string;
  cheek: string | null;
  water: string;
  gold: string;
}

function palette(color: PetColor, lcd: boolean): Palette {
  if (lcd) {
    return {
      outline: "var(--lcd-ink)",
      body: "var(--lcd-mid)",
      shade: "var(--lcd-mid)",
      highlight: "var(--lcd)",
      eye: "var(--lcd-ink)",
      cheek: null,
      water: "var(--lcd-ink)",
      gold: "var(--lcd-ink)",
    };
  }
  return {
    outline: "#1b1b1b",
    body: PET_COLORS[color],
    shade: "rgba(0,0,0,0.14)",
    highlight: "#ffffff",
    eye: "#1b1b1b",
    cheek: "#ff8fb1",
    water: "#7fd3ff",
    gold: "#f6c343",
  };
}

type EyeKind = "dot" | "happy" | "wide" | "closed";
type MouthKind = "smile" | "big" | "flat" | "o" | "frown";

const FACE: Record<
  Mood,
  {
    eyes: EyeKind;
    mouth: MouthKind;
    cheeks?: boolean;
    sweat?: boolean;
    tear?: boolean;
    drop?: number;
  }
> = {
  ecstatic: { eyes: "happy", mouth: "big", cheeks: true },
  happy: { eyes: "happy", mouth: "smile", cheeks: true },
  content: { eyes: "dot", mouth: "smile" },
  worried: { eyes: "dot", mouth: "flat", sweat: true },
  anxious: { eyes: "wide", mouth: "o", sweat: true },
  scared: { eyes: "wide", mouth: "frown", sweat: true },
  sad: { eyes: "dot", mouth: "frown", tear: true, drop: 1 },
  hungry: { eyes: "dot", mouth: "o" },
  tired: { eyes: "closed", mouth: "flat", drop: 1 },
  sleeping: { eyes: "closed", mouth: "flat" },
};

const EYES: Record<EyeKind, Px[]> = {
  dot: [
    [0, 0],
    [0, 1],
  ],
  happy: [
    [-1, 1],
    [0, 0],
    [1, 1],
  ],
  wide: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  closed: [
    [-1, 1],
    [0, 1],
    [1, 1],
  ],
};

const MOUTHS: Record<MouthKind, Px[]> = {
  smile: [
    [-1, 0],
    [0, 1],
    [1, 1],
    [2, 0],
  ],
  big: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  flat: [
    [0, 0],
    [1, 0],
  ],
  o: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  frown: [
    [-1, 1],
    [0, 0],
    [1, 0],
    [2, 1],
  ],
};

export const MOOD_ANIMATION: Record<Mood, string> = {
  ecstatic: "pet-wiggle",
  happy: "pet-bounce",
  content: "pet-bounce",
  worried: "pet-droop",
  anxious: "pet-shake",
  scared: "pet-shake",
  sad: "pet-droop",
  hungry: "pet-droop",
  tired: "pet-breathe",
  sleeping: "pet-breathe",
};

export function PixelPet({
  stage = "drop",
  mood = "happy",
  color = "blue",
  lcd = false,
  size = 120,
  animate = true,
  className,
  title,
}: {
  stage?: Stage;
  mood?: Mood;
  color?: PetColor;
  lcd?: boolean;
  size?: number;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const s = SHAPES[stage];
  const p = palette(color, lcd);
  const face = FACE[mood];
  const rects: { x: number; y: number; fill: string; key: string }[] = [];
  const cells = new Set<string>();

  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) if (inside(s, x, y)) cells.add(`${x},${y}`);
  const isIn = (x: number, y: number) => cells.has(`${x},${y}`);

  for (const cell of cells) {
    const [x, y] = cell.split(",").map(Number) as [number, number];
    const edge = !isIn(x - 1, y) || !isIn(x + 1, y) || !isIn(x, y - 1) || !isIn(x, y + 1);
    let fill = edge ? p.outline : p.body;
    if (!edge) {
      // Soft shade on the lower right, highlight on the upper left.
      if (Math.hypot(x + 0.5 - (s.cx - s.r * 0.5), y + 0.5 - (s.cy - s.r * 0.62)) < s.r * 0.2)
        fill = p.highlight;
    }
    rects.push({ x, y, fill, key: `b${cell}` });
    if (
      !edge &&
      !lcd &&
      Math.hypot(x + 0.5 - (s.cx + s.r * 0.5), y + 0.5 - (s.cy + s.r * 0.5)) < s.r * 0.45
    ) {
      rects.push({ x, y, fill: p.shade, key: `s${cell}` });
    }
  }
  // An extra highlight glint
  rects.push({
    x: Math.round(s.cx - s.r * 0.35),
    y: Math.round(s.cy - s.r * 0.95),
    fill: p.highlight,
    key: "glint",
  });

  const drop = face.drop ?? 0;
  const eyeY = Math.round(s.cy - 1) + drop;
  const eyeL = Math.round(s.cx - s.r * 0.42) - 1;
  const eyeR = Math.round(s.cx + s.r * 0.42);
  const eyePx: Px[] = [];
  for (const base of [eyeL, eyeR])
    for (const [dx, dy] of EYES[face.eyes]) eyePx.push([base + dx, eyeY + dy]);

  const mouthX = Math.round(s.cx) - 1;
  const mouthY = eyeY + 3;
  const mouthPx: Px[] = MOUTHS[face.mouth].map(([dx, dy]) => [mouthX + dx, mouthY + dy]);

  const extra: { x: number; y: number; fill: string; key: string }[] = [];
  if (face.cheeks && p.cheek) {
    extra.push(
      { x: eyeL - 1, y: eyeY + 2, fill: p.cheek, key: "cl" },
      { x: eyeR + 2, y: eyeY + 2, fill: p.cheek, key: "cr" },
    );
  }
  if (face.sweat)
    extra.push(
      { x: Math.round(s.cx + s.r), y: Math.round(s.cy - s.r * 0.6), fill: p.water, key: "sw1" },
      { x: Math.round(s.cx + s.r), y: Math.round(s.cy - s.r * 0.6) + 1, fill: p.water, key: "sw2" },
    );
  if (face.tear)
    extra.push(
      { x: eyeL, y: eyeY + 2, fill: p.water, key: "t1" },
      { x: eyeL, y: eyeY + 3, fill: p.water, key: "t2" },
    );

  // Stage details
  const bottom = Math.round(s.cy + s.r);
  if (stage !== "drop") {
    extra.push(
      { x: Math.round(s.cx) - 3, y: bottom, fill: p.outline, key: "f1" },
      { x: Math.round(s.cx) - 2, y: bottom, fill: p.outline, key: "f2" },
      { x: Math.round(s.cx) + 1, y: bottom, fill: p.outline, key: "f3" },
      { x: Math.round(s.cx) + 2, y: bottom, fill: p.outline, key: "f4" },
    );
  }
  if (stage === "splash" || stage === "wave" || stage === "tide") {
    extra.push(
      { x: 3, y: 5, fill: p.body, key: "d1" },
      { x: 16, y: 6, fill: p.body, key: "d2" },
      { x: 2, y: 9, fill: p.body, key: "d3" },
    );
  }
  if (stage === "wave" || stage === "tide") {
    const wx = Math.round(s.cx - s.r) - 2;
    const wy = Math.round(s.cy) + 1;
    extra.push(
      { x: wx, y: wy, fill: p.outline, key: "w1" },
      { x: wx, y: wy - 1, fill: p.outline, key: "w2" },
      { x: wx + 1, y: wy - 2, fill: p.outline, key: "w3" },
      { x: wx + 1, y: wy + 1, fill: p.outline, key: "w4" },
    );
  }
  if (stage === "tide") {
    const tx = Math.round(s.cx);
    const ty = Math.floor(s.tipY) - 2;
    for (const [dx, dy] of [
      [-2, 1],
      [-1, 1],
      [0, 1],
      [1, 1],
      [2, 1],
      [-2, 0],
      [0, -1],
      [0, 0],
      [2, 0],
    ] as Px[]) {
      extra.push({ x: tx + dx - 0, y: ty + dy, fill: p.gold, key: `c${dx}${dy}` });
    }
  }

  const blink = face.eyes !== "closed";

  return (
    <div
      className={clsx("relative inline-block", animate && MOOD_ANIMATION[mood], className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title ?? `A ${mood} pixel pet`}
    >
      <svg
        viewBox={`0 0 ${GRID} ${GRID}`}
        width={size}
        height={size}
        className="pixelated"
        shapeRendering="crispEdges"
      >
        {rects.map((r) => (
          <rect key={r.key} x={r.x} y={r.y} width={1} height={1} fill={r.fill} />
        ))}
        {extra.map((r) => (
          <rect key={r.key} x={r.x} y={r.y} width={1} height={1} fill={r.fill} />
        ))}
        <g className={clsx(blink && animate && "pet-blink")}>
          {eyePx.map(([x, y]) => (
            <rect key={`e${x},${y}`} x={x} y={y} width={1} height={1} fill={p.eye} />
          ))}
        </g>
        {mouthPx.map(([x, y]) => (
          <rect key={`m${x},${y}`} x={x} y={y} width={1} height={1} fill={p.eye} />
        ))}
      </svg>
      {mood === "sleeping" && animate && (
        <span
          className="float-z pointer-events-none absolute font-pixel text-lcd-ink"
          style={{
            right: "4%",
            top: "4%",
            fontSize: size * 0.16,
            color: lcd ? "var(--lcd-ink)" : "var(--fg)",
          }}
        >
          z
        </span>
      )}
    </div>
  );
}
