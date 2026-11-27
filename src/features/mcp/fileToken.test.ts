import { describe, expect, it } from "vitest";
import { createDocumentAccessToken, parseDocumentAccessToken } from "@/features/documents/domain/signedUrl";
import { createMcpFileToken, parseMcpFileToken } from "./fileToken";

describe("token file MCP", () => {
  it("accetta un token integro non scaduto", () => {
    const token = createMcpFileToken({
      documentId: "doc_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    expect(parseMcpFileToken(token)).toMatchObject({ documentId: "doc_1" });
  });

  it("rifiuta token scaduto o manipolato", () => {
    const token = createMcpFileToken({
      documentId: "doc_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    expect(parseMcpFileToken(`${token}x`)).toBeNull();
    expect(
      parseMcpFileToken(
        createMcpFileToken({
          documentId: "doc_1",
          expiresAtUnix: Math.floor(Date.now() / 1000) - 10,
        }),
      ),
    ).toBeNull();
  });

  it("non è intercambiabile con il token della route utente", () => {
    const mcp = createMcpFileToken({
      documentId: "doc_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    const user = createDocumentAccessToken({
      documentId: "doc_1",
      userId: "user_1",
      expiresAtUnix: Math.floor(Date.now() / 1000) + 60,
    });
    expect(parseDocumentAccessToken(mcp)).toBeNull();
    expect(parseMcpFileToken(user)).toBeNull();
  });
});
