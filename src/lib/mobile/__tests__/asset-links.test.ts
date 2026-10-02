import { describe, expect, it } from "vitest";
import { ANDROID_PACKAGE, assetLinks } from "../assetLinks";

const FP = Array.from({ length: 32 }, (_, i) => (i * 7).toString(16).padStart(2, "0")).join(":");

describe("Android asset links", () => {
  it("is empty until a signing key's fingerprint is configured", () => {
    expect(assetLinks({})).toEqual([]);
    expect(assetLinks({ ANDROID_CERT_FINGERPRINTS: "not-a-fingerprint" })).toEqual([]);
  });

  it("links the app's package to every configured key, normalized and deduplicated", () => {
    const [link] = assetLinks({
      ANDROID_CERT_FINGERPRINTS: ` ${FP.toLowerCase()}, ${FP.toUpperCase()} ,junk`,
    });
    expect(link).toEqual({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: [FP.toUpperCase()],
      },
    });
    expect(
      assetLinks({ ANDROID_CERT_FINGERPRINTS: FP, ANDROID_PACKAGE_NAME: "com.example.x" })[0]
        ?.target.package_name,
    ).toBe("com.example.x");
  });
});
