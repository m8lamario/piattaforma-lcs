export const EMAIL_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "DELIVERY_DELAYED",
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
] as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const TERMINAL_EMAIL_STATUSES = ["BOUNCED", "COMPLAINED", "FAILED"] as const;
export const ATTENTION_EMAIL_STATUSES = ["FAILED", "BOUNCED", "COMPLAINED"] as const;

const TERMINAL = new Set<string>(TERMINAL_EMAIL_STATUSES);

export function isEmailStatus(value: string): value is EmailStatus {
  return (EMAIL_STATUSES as readonly string[]).includes(value);
}

export function statusFromProviderEvent(type: string): EmailStatus | null {
  switch (type) {
    case "email.sent":
      return "SENT";
    case "email.delivered":
      return "DELIVERED";
    case "email.delivery_delayed":
      return "DELIVERY_DELAYED";
    case "email.bounced":
      return "BOUNCED";
    case "email.complained":
      return "COMPLAINED";
    case "email.failed":
      return "FAILED";
    default:
      return null;
  }
}

export function isTrackedProviderEvent(type: string) {
  return statusFromProviderEvent(type) !== null;
}

export function nextEmailStatus(current: EmailStatus, incoming: EmailStatus): EmailStatus {
  if (current === incoming) return current;
  if (TERMINAL.has(current) && incoming !== current) return current;
  if (incoming === "SENT" && current !== "QUEUED") return current;
  if (incoming === "DELIVERY_DELAYED" && (current === "DELIVERED" || TERMINAL.has(current))) {
    return current;
  }
  if (incoming === "DELIVERED" && TERMINAL.has(current)) return current;
  return incoming;
}

export function nextStatusFromProviderEvent(current: EmailStatus, type: string): EmailStatus {
  const incoming = statusFromProviderEvent(type);
  if (!incoming) return current;
  return nextEmailStatus(current, incoming);
}

export function canRetryEmail(row: { status: string; providerMessageId?: string | null }) {
  return row.status === "FAILED" && !row.providerMessageId;
}
