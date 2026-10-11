"use client";

import QRCode from "qrcode";
import { useMemo, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** A QR code that opens this site's app on a phone (drawn from the address the page was opened at). */
export function PhoneQr({ path = "/app", size = 132 }: { path?: string; size?: number }) {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => null,
  );
  const qr = useMemo(() => {
    if (!origin) return null;
    const { modules } = QRCode.create(origin + path, { errorCorrectionLevel: "M" });
    const cells: string[] = [];
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++)
        if (modules.get(y, x)) cells.push(`M${x} ${y}h1v1h-1z`);
    return { size: modules.size, d: cells.join(""), url: origin + path };
  }, [origin, path]);

  if (!qr) return <div style={{ width: size, height: size }} aria-hidden />;
  return (
    <svg
      viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for ${qr.url}`}
      shapeRendering="crispEdges"
      className="rounded-lg bg-white"
    >
      <path d={qr.d} fill="#111111" />
    </svg>
  );
}
