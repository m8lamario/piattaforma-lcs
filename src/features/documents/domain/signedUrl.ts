import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.AUTH_SECRET ?? "dev-only-storage-secret";
}

export function createDocumentAccessToken(input: {
  documentId: string;
  userId: string;
  expiresAtUnix: number;
}) {
  const payload = `${input.documentId}.${input.userId}.${input.expiresAtUnix}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseDocumentAccessToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [documentId, userId, exp, signature] = parts;
  if (!documentId || !userId || !exp || !signature) return null;
  const payload = `${documentId}.${userId}.${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const expiresAtUnix = Number(exp);
  if (!Number.isFinite(expiresAtUnix) || expiresAtUnix * 1000 <= Date.now()) return null;
  return { documentId, userId, expiresAtUnix };
}
