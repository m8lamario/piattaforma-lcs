import { afterEach, describe, expect, it } from "vitest";
import { authorizeMcpBearer, bearerTokenFromHeader, readMcpAuthConfig, tokensEqual } from "./auth";

const TOKEN = "mcp-review-token-32chars-minimum";

describe("autenticazione MCP", () => {
  afterEach(() => {
    delete process.env.MCP_REVIEW_ENABLED;
    delete process.env.MCP_REVIEW_TOKEN;
  });

  it("resta spento senza flag e token", () => {
    expect(readMcpAuthConfig({})).toBeNull();
    expect(readMcpAuthConfig({ MCP_REVIEW_TOKEN: TOKEN })).toBeNull();
    expect(readMcpAuthConfig({ MCP_REVIEW_ENABLED: "true" })).toBeNull();
    expect(readMcpAuthConfig({ MCP_REVIEW_ENABLED: "true", MCP_REVIEW_TOKEN: "short" })).toBeNull();
  });

  it("accetta solo il Bearer previsto", () => {
    const config = readMcpAuthConfig({
      MCP_REVIEW_ENABLED: "true",
      MCP_REVIEW_TOKEN: TOKEN,
    });
    expect(config).not.toBeNull();
    expect(authorizeMcpBearer(null, config)).toBe(false);
    expect(authorizeMcpBearer("Bearer wrong-token-32chars-minimum!", config)).toBe(false);
    expect(authorizeMcpBearer("Bearer short", config)).toBe(false);
    expect(authorizeMcpBearer(`Bearer ${TOKEN}`, config)).toBe(true);
    expect(bearerTokenFromHeader(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(tokensEqual(TOKEN, TOKEN)).toBe(true);
  });
});
