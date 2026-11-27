import { createHash, timingSafeEqual } from "node:crypto";

export type McpAuthConfig = {
  enabled: boolean;
  token: string;
};

export function readMcpAuthConfig(
  env: Record<string, string | undefined> = process.env,
): McpAuthConfig | null {
  const token = env.MCP_REVIEW_TOKEN?.trim() ?? "";
  const enabled = env.MCP_REVIEW_ENABLED === "true";
  if (!enabled || token.length < 16) return null;
  return { enabled: true, token };
}

export function bearerTokenFromHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export function tokensEqual(presented: string, expected: string): boolean {
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function authorizeMcpBearer(
  authorizationHeader: string | null,
  config: McpAuthConfig | null = readMcpAuthConfig(),
): boolean {
  if (!config) return false;
  const presented = bearerTokenFromHeader(authorizationHeader);
  if (!presented) return false;
  return tokensEqual(presented, config.token);
}

export function mcpUnauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": "Bearer",
      "Cache-Control": "no-store",
    },
  });
}

export function mcpRateLimitedResponse(): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

export function mcpAuthorizationKey(authorizationHeader: string | null): string {
  const material = authorizationHeader?.trim() || "none";
  return `mcp:${createHash("sha256").update(material).digest("hex").slice(0, 32)}`;
}
