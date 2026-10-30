import type { ParticipantCategory } from "@/features/teams/domain/staff";

export const MAX_FEE_CENTS = 10_000_000;

export type PaymentMode = "PLAYER" | "TEAM" | "BOTH";

export type FeeResolution =
  | { status: "not_due" }
  | { status: "missing" }
  | { status: "ready"; cents: number };

const EURO_AMOUNT = /^\d+(\.\d{1,2})?$/;

export function parseEuroToCents(raw: string): { ok: true; cents: number } | { ok: false } {
  const text = raw.trim().replace(",", ".");
  if (!EURO_AMOUNT.test(text)) return { ok: false };
  const [whole, frac = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_FEE_CENTS) return { ok: false };
  return { ok: true, cents };
}

export function decimalToCents(amount: { toString(): string } | number | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  const text = typeof amount === "number" ? amount.toFixed(2) : amount.toString();
  const parsed = parseEuroToCents(text);
  return parsed.ok ? parsed.cents : null;
}

export function centsToDecimalString(cents: number) {
  const whole = Math.trunc(cents / 100);
  const frac = String(Math.abs(cents % 100)).padStart(2, "0");
  return `${whole}.${frac}`;
}

export function formatEuro(cents: number) {
  const whole = Math.trunc(cents / 100);
  const frac = String(Math.abs(cents % 100)).padStart(2, "0");
  return `${whole},${frac}`;
}

export function formatSignedEuro(cents: number) {
  return `${cents < 0 ? "−" : ""}${formatEuro(Math.abs(cents))}`;
}

function pickOverride(overrideCents: number | null | undefined, editionAmount: { toString(): string } | number | null | undefined): FeeResolution {
  if (overrideCents != null) {
    if (!Number.isInteger(overrideCents) || overrideCents < 1 || overrideCents > MAX_FEE_CENTS) {
      return { status: "missing" };
    }
    return { status: "ready", cents: overrideCents };
  }
  const cents = decimalToCents(editionAmount);
  return cents === null ? { status: "missing" } : { status: "ready", cents };
}

export function resolveParticipantFee(input: {
  category: ParticipantCategory;
  paymentMode: PaymentMode;
  teamPlayerFeeCents: number | null;
  teamStaffFeeCents: number | null;
  editionPlayerFee: { toString(): string } | number | null | undefined;
  editionStaffFee: { toString(): string } | number | null | undefined;
}): FeeResolution {
  if (input.paymentMode === "TEAM") return { status: "not_due" };
  if (input.category === "STAFF") {
    return pickOverride(input.teamStaffFeeCents, input.editionStaffFee);
  }
  return pickOverride(input.teamPlayerFeeCents, input.editionPlayerFee);
}

export function resolveTeamFee(input: {
  paymentMode: PaymentMode;
  teamFeeCents: number | null;
  editionTeamFee: { toString(): string } | number | null | undefined;
}): FeeResolution {
  if (input.paymentMode === "PLAYER") return { status: "not_due" };
  return pickOverride(input.teamFeeCents, input.editionTeamFee);
}

/** Un pagamento PENDING conserva l'importo già registrato. */
export function applyPendingSnapshot(pendingCents: number | null, resolved: FeeResolution): FeeResolution {
  if (pendingCents != null && Number.isInteger(pendingCents) && pendingCents > 0 && pendingCents <= MAX_FEE_CENTS) {
    return { status: "ready", cents: pendingCents };
  }
  return resolved;
}

export function feeUsesDefault(cents: number | null) {
  return cents == null;
}

export function teamFeeIsCustom(input: {
  playerFeeCents: number | null;
  staffFeeCents: number | null;
  teamFeeCents: number | null;
}) {
  return input.playerFeeCents != null || input.staffFeeCents != null || input.teamFeeCents != null;
}
