import { describe, expect, it } from "vitest";
import { adminDocumentSelect } from "./adminView";

describe("admin document list projection", () => {
  it("non include storageKey", () => {
    expect(JSON.stringify(adminDocumentSelect)).not.toContain("storageKey");
    expect(JSON.stringify(adminDocumentSelect)).not.toContain("checksumSha256");
  });
});
