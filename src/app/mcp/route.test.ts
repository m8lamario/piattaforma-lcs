import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("route MCP certificati", () => {
  it("richiede Bearer e non espone un tool di rifiuto", () => {
    const route = readFileSync(path.join(process.cwd(), "src/app/mcp/route.ts"), "utf8");
    const tools = readFileSync(path.join(process.cwd(), "src/features/mcp/tools.ts"), "utf8");
    const data = readFileSync(path.join(process.cwd(), "src/features/documents/data/aiReview.ts"), "utf8");
    expect(route).toContain("authorizeMcpBearer");
    expect(route).toContain("mcpUnauthorizedResponse");
    expect(tools).toContain("list_pending_certificates");
    expect(tools).toContain("get_certificate_file");
    expect(tools).toContain("approve_certificate");
    expect(tools).toContain("data_rilascio");
    expect(tools).toContain("scadenza_calcolata");
    expect(tools).toContain("data_scadenza_proposta");
    expect(tools).toContain("flag_certificate");
    expect(tools).not.toContain("reject_certificate");
    expect(tools).not.toMatch(/decision:\s*"REJECTED"/);
    expect(data).not.toMatch(/decision:\s*"REJECTED"/);
    expect(data).toContain('status: "APPROVED"');
    expect(data).toContain('aiReviewState: "FLAGGED"');
  });
});
