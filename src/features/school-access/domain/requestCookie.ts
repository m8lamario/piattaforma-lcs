import { createHmac, timingSafeEqual } from "node:crypto";

function pepper() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET mancante");
  return secret;
}

export function signSchoolAccessRequestId(requestId: string) {
  const signature = createHmac("sha256", pepper()).update(`school-access:${requestId}`).digest("hex").slice(0, 32);
  return `${requestId}.${signature}`;
}

export function readSchoolAccessRequestId(value: string | undefined | null) {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const requestId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = createHmac("sha256", pepper()).update(`school-access:${requestId}`).digest("hex").slice(0, 32);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return requestId;
}
