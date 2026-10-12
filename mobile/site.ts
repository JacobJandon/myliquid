/**
 * The MyLiquid site the app opens. Set EXPO_PUBLIC_SITE_URL (for example in mobile/.env.local) to point it
 * somewhere else; the default is the Vercel production domain.
 */
export const SITE_URL = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://myliquid-jacobjandons-projects.vercel.app"
).replace(/\/+$/, "");
