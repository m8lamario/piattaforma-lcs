import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "./filename";

describe("sanitizeFilename", () => {
  it("rimuove path e caratteri pericolosi", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("certificato (1).PDF")).toBe("certificato_1_.PDF");
  });
});
