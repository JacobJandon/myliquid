/**
 * Links into Expo Go for testing the iPhone app (mobile/). The "iPhone test (Expo Go)" workflow serves the app behind
 * a temporary tunnel and links to `/expo-go?u=…`, which opens Expo Go in one tap. Only Expo Go links to the tunnel
 * hosts that workflow and Expo use are accepted, so the page can't send anyone elsewhere.
 */

export const EXPO_GO_APP_STORE = "https://apps.apple.com/app/expo-go/id982107779";

const EXPO_GO_LINK =
  /^exps?:\/\/[a-z0-9-]+\.(trycloudflare\.com|exp\.direct)(:\d{1,5})?(\/[\w\-./~%]*)?$/i;

/** The Expo Go link to open, or null when `u` isn't one we serve. */
export function expoGoLink(u: unknown): string | null {
  return typeof u === "string" && u.length < 300 && EXPO_GO_LINK.test(u) ? u : null;
}
