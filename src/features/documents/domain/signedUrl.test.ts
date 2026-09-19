import { describe, expect, it } from "vitest";
import { createDocumentAccessToken, parseDocumentAccessToken } from "./signedUrl";

describe("document access token", () => {
  it("accetta un token integro non scaduto", () => {
    const token = createDocumentAccessToken({
      documentId: "doc_1",
      userId: "user_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    expect(parseDocumentAccessToken(token)).toMatchObject({
      documentId: "doc_1",
      userId: "user_1",
    });
    expect(token).not.toContain("storage");
    expect(token).not.toContain("documents/");
  });

  it("rifiuta token manipolato o scaduto", () => {
    const token = createDocumentAccessToken({
      documentId: "doc_1",
      userId: "user_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    expect(parseDocumentAccessToken(`${token}x`)).toBeNull();
    expect(
      parseDocumentAccessToken(
        createDocumentAccessToken({
          documentId: "doc_1",
          userId: "user_1",
          expiresAtUnix: Math.floor(Date.now() / 1000) - 10,
        }),
      ),
    ).toBeNull();
  });
});
