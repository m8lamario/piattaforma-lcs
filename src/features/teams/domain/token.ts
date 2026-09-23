import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function createInviteToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isWellFormedInviteToken(token: string) {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** Accetta il token opaco o l’URL completo `/invito/[token]`. */
export function extractInviteToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fromPath = tokenFromInvitePath(trimmed);
  if (fromPath) return fromPath;

  return isWellFormedInviteToken(trimmed) ? trimmed : null;
}

function tokenFromInvitePath(raw: string): string | null {
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(raw, "https://esl-player-hub.local");
    const parts = url.pathname.split("/").filter(Boolean);
    const inviteIndex = parts.lastIndexOf("invito");
    const joinIndex = parts.lastIndexOf("iscrizione");
    const index = Math.max(inviteIndex, joinIndex);
    const token = index >= 0 ? parts[index + 1] : undefined;
    if (token && isWellFormedInviteToken(token)) return token;
  } catch {
    return null;
  }
  return null;
}
