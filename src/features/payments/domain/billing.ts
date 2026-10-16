export type BillingSnapshot = {
  billingName: string | null;
  billingEmail: string | null;
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type StoredBilling = {
  billingName: string | null;
  billingEmail: string | null;
  billingLine1: string | null;
  billingLine2: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingCountry: string | null;
};

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function billingFromStripeDetails(details: {
  name?: string | null;
  email?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
} | null | undefined): BillingSnapshot | null {
  if (!details) return null;
  const snapshot: BillingSnapshot = {
    billingName: blankToNull(details.name),
    billingEmail: blankToNull(details.email),
    line1: blankToNull(details.address?.line1),
    line2: blankToNull(details.address?.line2),
    postalCode: blankToNull(details.address?.postal_code),
    city: blankToNull(details.address?.city),
    state: blankToNull(details.address?.state),
    country: blankToNull(details.address?.country),
  };
  return Object.values(snapshot).some(Boolean) ? snapshot : null;
}

export function checkoutCustomerPrefill(input: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const email = blankToNull(input.email);
  const name = [blankToNull(input.firstName), blankToNull(input.lastName)].filter(Boolean).join(" ") || null;
  return { email, name };
}

const BILLING_COLUMNS = [
  ["billingName", "billingName"],
  ["billingEmail", "billingEmail"],
  ["line1", "billingLine1"],
  ["line2", "billingLine2"],
  ["postalCode", "billingPostalCode"],
  ["city", "billingCity"],
  ["state", "billingState"],
  ["country", "billingCountry"],
] as const;

export function billingFill(
  current: StoredBilling | null,
  incoming: BillingSnapshot | null | undefined,
): Partial<StoredBilling> {
  if (!incoming) return {};
  const patch: Partial<StoredBilling> = {};
  for (const [source, target] of BILLING_COLUMNS) {
    const value = incoming[source];
    if (!value) continue;
    if (current && current[target]) continue;
    patch[target] = value;
  }
  return patch;
}
