import type {
  LeagueMedicalStatus,
  LeaguePaymentStatus,
  LeaguePlayerRecord,
  LeagueSchoolRecord,
  LeagueSchoolStatus,
} from "./status";

export const LEAGUE_PLAYERS_CSV_HEADERS = [
  "Nome",
  "Cognome",
  "Scuola",
  "Stato iscrizione",
  "Documentazione medica",
  "Pagamento",
  "Data completamento",
] as const;

export const LEAGUE_SUMMARY_CSV_HEADERS = [
  "Scuola",
  "Giocatori",
  "Completate",
  "Incomplete",
  "Percentuale",
  "Stato scuola",
] as const;

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",;\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

function csvTable(headers: readonly string[], rows: string[][]) {
  const lines = [headers.join(";"), ...rows.map((row) => row.map(csvCell).join(";"))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function leaguePlayersToCsv(
  rows: LeaguePlayerRecord[],
  labels: {
    status: (value: string) => string;
    medical: (value: LeagueMedicalStatus) => string;
    payment: (value: LeaguePaymentStatus) => string;
    completedAt: (value: string | null) => string;
  },
) {
  return csvTable(
    LEAGUE_PLAYERS_CSV_HEADERS,
    rows.map((row) => [
      row.firstName,
      row.lastName,
      row.schoolName,
      labels.status(row.registrationStatus),
      labels.medical(row.medicalStatus),
      labels.payment(row.paymentStatus),
      labels.completedAt(row.completedAt),
    ]),
  );
}

export function leagueSummaryToCsv(
  rows: LeagueSchoolRecord[],
  statusLabel: (value: LeagueSchoolStatus) => string,
) {
  return csvTable(
    LEAGUE_SUMMARY_CSV_HEADERS,
    rows.map((row) => [
      row.schoolName,
      String(row.playerCount),
      String(row.completedCount),
      String(row.incompleteCount),
      `${row.percent}%`,
      statusLabel(row.status),
    ]),
  );
}

export function leagueExportFilename(kind: "giocatori" | "riepilogo", input: { competitionName: string; editionName: string }) {
  const slug = [input.competitionName, input.editionName, kind]
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${slug || "lega"}.csv`;
}
