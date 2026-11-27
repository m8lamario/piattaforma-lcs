import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { registerCertificateReviewTools } from "./tools";

function requestTrace(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for");
  return {
    ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
    userAgent: request?.headers.get("user-agent") ?? null,
  };
}

export const mcpHandler = createMcpHandler(
  ({ requestInfo }) => {
    const server = new McpServer({
      name: "esl-certificate-review",
      version: "1.0.0",
    });
    registerCertificateReviewTools(server, requestTrace(requestInfo));
    return server;
  },
  { responseMode: "json" },
);
