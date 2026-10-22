import type { ParticipantCategory } from "@/features/teams/domain/staff";
import { resolveParticipantFee, resolveTeamFee, type PaymentMode } from "./fees";

type Money = { toString(): string } | number | null | undefined;

export function playerCheckoutAmount(input: {
  paymentMode: PaymentMode;
  playerFeeAmount: Money;
  playerFeeCents?: number | null;
}) {
  const fee = resolveParticipantFee({
    category: "PLAYER",
    paymentMode: input.paymentMode,
    teamPlayerFeeCents: input.playerFeeCents ?? null,
    teamStaffFeeCents: null,
    editionPlayerFee: input.playerFeeAmount,
    editionStaffFee: null,
  });
  return fee.status === "ready" ? fee.cents : null;
}

export function teamCheckoutAmount(input: {
  paymentMode: PaymentMode;
  teamFeeAmount: Money;
  teamFeeCents?: number | null;
}) {
  const fee = resolveTeamFee({
    paymentMode: input.paymentMode,
    teamFeeCents: input.teamFeeCents ?? null,
    editionTeamFee: input.teamFeeAmount,
  });
  return fee.status === "ready" ? fee.cents : null;
}

export function staffCheckoutAmount(input: {
  paymentMode: PaymentMode;
  staffFeeAmount: Money;
  staffFeeCents?: number | null;
}) {
  const fee = resolveParticipantFee({
    category: "STAFF",
    paymentMode: input.paymentMode,
    teamPlayerFeeCents: null,
    teamStaffFeeCents: input.staffFeeCents ?? null,
    editionPlayerFee: null,
    editionStaffFee: input.staffFeeAmount,
  });
  return fee.status === "ready" ? fee.cents : null;
}

export function participantCheckoutAmount(input: {
  category: ParticipantCategory;
  paymentMode: PaymentMode;
  playerFeeAmount: Money;
  staffFeeAmount: Money;
  playerFeeCents?: number | null;
  staffFeeCents?: number | null;
}) {
  const fee = resolveParticipantFee({
    category: input.category,
    paymentMode: input.paymentMode,
    teamPlayerFeeCents: input.playerFeeCents ?? null,
    teamStaffFeeCents: input.staffFeeCents ?? null,
    editionPlayerFee: input.playerFeeAmount,
    editionStaffFee: input.staffFeeAmount,
  });
  return fee.status === "ready" ? fee.cents : null;
}
