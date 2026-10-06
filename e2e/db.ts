import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "e2e", "db-cli.ts");

function run(command: string, value: string) {
  const output = execSync(`npx tsx "${SCRIPT}" ${command} ${JSON.stringify(value)}`, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

export async function markEmailVerified(email: string) {
  run("verify-email", email);
}

export async function replaceGuardianAuthorizeToken(playerEmail: string) {
  return run("replace-guardian-token", playerEmail);
}

export async function guardianAuthorizeEmailQueued(playerEmail: string) {
  return run("guardian-email-queued", playerEmail) === "true";
}

export async function clearRateLimits(prefix: string) {
  run("clear-rate-limits", prefix);
}
