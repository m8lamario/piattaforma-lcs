import { describe, expect, it } from "vitest";
import { declaredMimeMatches, detectAllowedMime } from "./magic";

describe("document magic bytes", () => {
  it("riconosce PDF JPEG PNG e rifiuta altro", () => {
    expect(detectAllowedMime(Buffer.from("%PDF-1.4"))).toBe("application/pdf");
    expect(detectAllowedMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      detectAllowedMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(detectAllowedMime(Buffer.from("MZ"))).toBeNull();
  });

  it("allinea Content-Type dichiarato e magic", () => {
    expect(declaredMimeMatches("application/pdf", "application/pdf")).toBe(true);
    expect(declaredMimeMatches("image/jpeg", "image/jpg")).toBe(true);
    expect(declaredMimeMatches("application/pdf", "image/png")).toBe(false);
    expect(declaredMimeMatches("application/pdf", "")).toBe(true);
    expect(declaredMimeMatches("application/pdf", "application/octet-stream")).toBe(true);
  });
});
