import { DEFAULT_STAFF_FEE_EUR, type ParticipantCategory } from "@/features/teams/domain/staff";

export function demoFeeIfMissing(amount: { toString(): string } | number | null | undefined) {
  if (amount === null || amount === undefined) return 40;
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  if (!Number.isFinite(value) || value <= 0) return 40;
  return value;
}

export function playerCheckoutAmount(input: {
  paymentMode: "PLAYER" | "TEAM" | "BOTH";
  playerFeeAmount: { toString(): string } | number | null | undefined;
}) {
  if (input.paymentMode === "TEAM") return null;
  return demoFeeIfMissing(input.playerFeeAmount);
}

export function teamCheckoutAmount(input: {
  paymentMode: "PLAYER" | "TEAM" | "BOTH";
  teamFeeAmount: { toString(): string } | number | null | undefined;
}) {
  if (input.paymentMode === "PLAYER") return null;
  return demoFeeIfMissing(input.teamFeeAmount);
}

function positiveAmount(amount: { toString(): string } | number | null | undefined) {
  if (amount === null || amount === undefined) return null;
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function staffCheckoutAmount(input: {
  paymentMode: "PLAYER" | "TEAM" | "BOTH";
  staffFeeAmount: { toString(): string } | number | null | undefined;
}) {
  if (input.paymentMode === "TEAM") return null;
  return positiveAmount(input.staffFeeAmount) ?? DEFAULT_STAFF_FEE_EUR;
}

export function participantCheckoutAmount(input: {
  category: ParticipantCategory;
  paymentMode: "PLAYER" | "TEAM" | "BOTH";
  playerFeeAmount: { toString(): string } | number | null | undefined;
  staffFeeAmount: { toString(): string } | number | null | undefined;
}) {
  if (input.category === "STAFF") {
    return staffCheckoutAmount({ paymentMode: input.paymentMode, staffFeeAmount: input.staffFeeAmount });
  }
  return playerCheckoutAmount({ paymentMode: input.paymentMode, playerFeeAmount: input.playerFeeAmount });
}
