/**
 * Digital Asset Links for the Android app (`android/`, a Trusted Web Activity). Android checks
 * `/.well-known/assetlinks.json` to confirm the app and the site belong together; when they do, the app opens
 * full screen, without a URL bar. The signing key's SHA-256 fingerprint comes from the environment
 * (ANDROID_CERT_FINGERPRINTS, comma-separated; the Android build prints it), so a new key needs no code change.
 */

export const ANDROID_PACKAGE = "com.myliquid.app";

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export interface AssetLink {
  relation: string[];
  target: { namespace: "android_app"; package_name: string; sha256_cert_fingerprints: string[] };
}

export function assetLinks(env: {
  ANDROID_CERT_FINGERPRINTS?: string;
  ANDROID_PACKAGE_NAME?: string;
}): AssetLink[] {
  const fingerprints = (env.ANDROID_CERT_FINGERPRINTS ?? "")
    .split(/[\s,]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => FINGERPRINT.test(f));
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: env.ANDROID_PACKAGE_NAME || ANDROID_PACKAGE,
        sha256_cert_fingerprints: [...new Set(fingerprints)],
      },
    },
  ];
}
