import { formatEuro, type FeeResolution, type PaymentMode } from "@/features/payments/domain/fees";

export const BANK_TRANSFER_PROVIDER = "bank_transfer";
export const MAX_TRANSFER_CENTS = 100_000_000;

export type BankTransferCategory = "PLAYER" | "STAFF";

export type BankTransferMember = {
  registrationId: string;
  userId: string;
  category: BankTransferCategory;
  name: string;
  status: string;
  succeededProvider: string | null;
};

export type BankTransferDue = {
  registrationId: string;
  userId: string;
  category: BankTransferCategory;
  name: string;
  cents: number;
};

export type BankTransferSkipped = {
  name: string;
  category: BankTransferCategory;
  provider: string;
};

export type BankTransferRoster = {
  registrationId: string;
  name: string;
  category: BankTransferCategory;
};

export type BankTransferQuote =
  | { status: "missing"; names: string[] }
  | { status: "nothing_due" }
  | {
      status: "ready";
      channel: "team" | "members";
      expectedCents: number;
      currency: string;
      due: BankTransferDue[];
      skipped: BankTransferSkipped[];
      roster: BankTransferRoster[];
    };

const ACTIVE_EXCLUDED = new Set(["WITHDRAWN", "REMOVED"]);

export function isActiveForBankTransfer(status: string) {
  return !ACTIVE_EXCLUDED.has(status);
}

export function quoteBankTransfer(input: {
  paymentMode: PaymentMode;
  currency: string;
  teamCovered: boolean;
  teamFee: FeeResolution;
  members: BankTransferMember[];
  feeFor: (category: BankTransferCategory) => FeeResolution;
}): BankTransferQuote {
  const active = input.members.filter((member) => isActiveForBankTransfer(member.status));

  if (input.paymentMode === "TEAM") {
    if (input.teamCovered) return { status: "nothing_due" };
    if (input.teamFee.status !== "ready") return { status: "missing", names: [] };
    return {
      status: "ready",
      channel: "team",
      expectedCents: input.teamFee.cents,
      currency: input.currency,
      due: [],
      skipped: [],
      roster: active.map((member) => ({
        registrationId: member.registrationId,
        name: member.name,
        category: member.category,
      })),
    };
  }

  const due: BankTransferDue[] = [];
  const skipped: BankTransferSkipped[] = [];
  const missing: string[] = [];

  for (const member of active) {
    if (member.succeededProvider) {
      skipped.push({
        name: member.name,
        category: member.category,
        provider: member.succeededProvider,
      });
      continue;
    }
    const fee = input.feeFor(member.category);
    if (fee.status !== "ready") {
      missing.push(member.name);
      continue;
    }
    due.push({
      registrationId: member.registrationId,
      userId: member.userId,
      category: member.category,
      name: member.name,
      cents: fee.cents,
    });
  }

  if (missing.length > 0) return { status: "missing", names: missing };
  if (due.length === 0) return { status: "nothing_due" };
  return {
    status: "ready",
    channel: "members",
    expectedCents: due.reduce((sum, line) => sum + line.cents, 0),
    currency: input.currency,
    due,
    skipped,
    roster: [],
  };
}

export function receivedDifference(receivedCents: number, expectedCents: number) {
  return receivedCents - expectedCents;
}

export function formatTransferDifference(cents: number, currency: string) {
  if (cents === 0) return null;
  const amount = `${formatEuro(Math.abs(cents))} ${currency}`;
  return cents > 0 ? `${amount} in più rispetto al totale previsto` : `${amount} in meno rispetto al totale previsto`;
}

export function parseTransferReference(raw: string) {
  const text = raw.trim().replace(/\s+/g, " ");
  if (text.length < 2 || text.length > 80) return null;
  if (/[\u0000-\u001F\u007F]/.test(text)) return null;
  return text;
}

export function parseTransferDate(raw: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  const stamp = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    stamp.getUTCFullYear() !== year ||
    stamp.getUTCMonth() !== month - 1 ||
    stamp.getUTCDate() !== day ||
    year < 2000
  ) {
    return null;
  }
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(now);
  if (raw > today) return null;
  return stamp;
}

export function parseTransferAmount(cents: number) {
  return Number.isInteger(cents) && cents >= 1 && cents <= MAX_TRANSFER_CENTS;
}
