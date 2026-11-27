import { consumeRateLimit, RATE_LIMITS } from "@/shared/lib/request-guard";
import {
  authorizeMcpBearer,
  mcpAuthorizationKey,
  mcpRateLimitedResponse,
  mcpUnauthorizedResponse,
  readMcpAuthConfig,
} from "@/features/mcp/auth";
import { mcpHandler } from "@/features/mcp/server";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!authorizeMcpBearer(request.headers.get("authorization"), readMcpAuthConfig())) {
    return mcpUnauthorizedResponse();
  }
  const allowed = await consumeRateLimit(
    mcpAuthorizationKey(request.headers.get("authorization")),
    RATE_LIMITS.mcp.limit,
    RATE_LIMITS.mcp.windowMs,
  );
  if (!allowed) return mcpRateLimitedResponse();
  return mcpHandler.fetch(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
