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
