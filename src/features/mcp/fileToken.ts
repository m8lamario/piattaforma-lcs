import { createHmac, timingSafeEqual } from "node:crypto";
import { MCP_FILE_TTL_SECONDS } from "@/shared/config/app";

const KIND = "mcp";
const PURPOSE = "ai";

function secret() {
  return process.env.AUTH_SECRET ?? "dev-only-storage-secret";
}

export function createMcpFileToken(input: {
  documentId: string;
  expiresAtUnix: number;
}): string {
  const payload = `${KIND}.${PURPOSE}.${input.documentId}.${input.expiresAtUnix}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseMcpFileToken(token: string): { documentId: string; expiresAtUnix: number } | null {
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [kind, purpose, documentId, exp, signature] = parts;
  if (kind !== KIND || purpose !== PURPOSE || !documentId || !exp || !signature) return null;
  const payload = `${kind}.${purpose}.${documentId}.${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const expiresAtUnix = Number(exp);
  if (!Number.isFinite(expiresAtUnix) || expiresAtUnix * 1000 <= Date.now()) return null;
  return { documentId, expiresAtUnix };
}

export function mcpFileTtlSeconds(): number {
  return MCP_FILE_TTL_SECONDS;
}
