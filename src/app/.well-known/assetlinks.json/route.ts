import { assetLinks } from "@/lib/mobile/assetLinks";

export const dynamic = "force-dynamic";

/** Digital Asset Links: lets the Android app open this site full screen (see `lib/mobile/assetLinks.ts`). */
export function GET() {
  const { ANDROID_CERT_FINGERPRINTS, ANDROID_PACKAGE_NAME } = process.env;
  return Response.json(assetLinks({ ANDROID_CERT_FINGERPRINTS, ANDROID_PACKAGE_NAME }), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
