export type PaymentRegisterRow = {
  firstName: string;
  lastName: string;
  email: string;
  billingName: string;
  residenceLine: string;
  residencePostalCode: string;
  residenceCity: string;
  residenceProvince: string;
  billingLine: string;
  billingPostalCode: string;
  billingCity: string;
  billingProvince: string;
  billingCountry: string;
  amount: string;
  currency: string;
  paidOn: string;
  role: string;
  status: string;
  transactionId: string;
  method: string;
};

export const PAYMENT_REGISTER_HEADERS = [
  "Nome",
  "Cognome",
  "Email",
  "Nome fatturazione",
  "Indirizzo residenza",
  "CAP residenza",
  "Comune residenza",
  "Provincia residenza",
  "Indirizzo fatturazione",
  "CAP fatturazione",
  "Comune fatturazione",
  "Provincia fatturazione",
  "Paese fatturazione",
  "Importo",
  "Valuta",
  "Data pagamento",
  "Ruolo",
  "Stato pagamento",
  "ID transazione",
  "Metodo",
] as const;

export function paymentMethodLabel(provider: string) {
  if (provider === "bank_transfer") return "Bonifico";
  if (provider === "stripe") return "Stripe";
  if (provider === "stub") return "Simulazione";
  return provider;
}

export function paymentRoleLabel(input: { category: "PLAYER" | "STAFF" | null; teamFee: boolean }) {
  if (input.category === "STAFF") return "Staff tecnico";
  if (input.category === "PLAYER") return "Giocatore";
  if (input.teamFee) return "Quota squadra";
  return "";
}

export function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "In attesa";
    case "SUCCEEDED":
      return "Riuscito";
    case "FAILED":
      return "Non riuscito";
    case "REFUNDED":
      return "Rimborsato";
    default:
      return "";
  }
}

export function exportIdentity(input: {
  firstName?: string | null;
  lastName?: string | null;
  userEmail?: string | null;
  billingEmail?: string | null;
}) {
  return {
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    email: input.userEmail?.trim() || input.billingEmail?.trim() || "",
  };
}

export function paymentDateLabel(paidAt: Date | null) {
  if (!paidAt) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(paidAt);
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",;\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function paymentsToCsv(rows: PaymentRegisterRow[]) {
  const lines = [
    PAYMENT_REGISTER_HEADERS.join(";"),
    ...rows.map((row) =>
      [
        row.firstName,
        row.lastName,
        row.email,
        row.billingName,
        row.residenceLine,
        row.residencePostalCode,
        row.residenceCity,
        row.residenceProvince,
        row.billingLine,
        row.billingPostalCode,
        row.billingCity,
        row.billingProvince,
        row.billingCountry,
        row.amount,
        row.currency,
        row.paidOn,
        row.role,
        row.status,
        row.transactionId,
        row.method,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
