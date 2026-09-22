import type { ErrorCode } from "@/shared/errors";

export function playerCheckoutBlocker(input: {
  covered: boolean;
  amount: number | null;
}): ErrorCode | null {
  if (input.covered) return "PAYMENT_ALREADY_COMPLETED";
  if (input.amount === null) return "PAYMENT_TEAM_PAYS";
  return null;
}

export function teamCheckoutBlocker(input: {
  covered: boolean;
  amount: number | null;
}): ErrorCode | null {
  if (input.covered) return "PAYMENT_ALREADY_COMPLETED";
  if (input.amount === null) return "PAYMENT_PLAYER_PAYS";
  return null;
}

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type WebhookApplyDecision = "apply" | "idempotent" | "duplicate" | "conflict" | "not_found";

export function webhookApplyDecision(input: {
  current: { id: string; status: PaymentStatus } | null;
  incomingStatus: PaymentStatus;
  otherSucceededWithSameProviderId: boolean;
}): WebhookApplyDecision {
  if (input.otherSucceededWithSameProviderId) return "duplicate";
  if (!input.current) return "not_found";
  if (input.current.status === input.incomingStatus) return "idempotent";
  if (input.current.status === "PENDING" || input.current.status === "FAILED") return "apply";
  return "conflict";
}
