import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import { shouldTrack, type EventName } from "@/lib/domain/analytics";
import { track } from "@/lib/services/analytics";
import { VISITOR_COOKIE } from "./constants";

/**
 * Analytics from inside a request. The visitor id is a random first-party cookie (`ml_vid`, set by the proxy);
 * nothing is recorded for bots or for visitors who send Global Privacy Control or Do Not Track.
 */

export { VISITOR_COOKIE };

type Props = Record<string, string | number | boolean | null>;

function allowed(h: Headers): boolean {
  return shouldTrack({
    userAgent: h.get("user-agent"),
    gpc: h.get("sec-gpc"),
    dnt: h.get("dnt"),
  });
}

function cookieFrom(h: Headers, name: string): string | null {
  const m = (h.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

/** The visitor id on a route handler's request, or null when this visitor isn't tracked. */
export function visitorOf(req: Request): string | null {
  return allowed(req.headers) ? cookieFrom(req.headers, VISITOR_COOKIE) : null;
}

/** Records an event from a route handler. Never throws. */
export function trackRequest(
  req: Request,
  name: EventName,
  investorId: string | null = null,
  props: Props = {},
): void {
  if (!allowed(req.headers)) return;
  track(getDb(), name, { visitorId: cookieFrom(req.headers, VISITOR_COOKIE), investorId }, props);
}

/** The current visitor in a server component, or null when not tracked. */
export async function currentVisitor(): Promise<{ id: string | null; tracked: boolean }> {
  const h = await headers();
  if (!allowed(h)) return { id: null, tracked: false };
  return { id: (await cookies()).get(VISITOR_COOKIE)?.value ?? null, tracked: true };
}
