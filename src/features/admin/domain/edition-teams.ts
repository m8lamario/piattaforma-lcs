const PLAYER_ACCOUNT_STARTED = new Set([
  "ACCOUNT_CREATED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PAYMENT_PENDING",
  "APPROVED",
  "WITHDRAWN",
]);

export type EditionTeamRegistration = {
  category: string;
  status: string;
};

export type EditionTeamSource = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  school: { name: string; city?: string | null };
  representative?: { name?: string | null; email?: string | null } | null;
  registrations: EditionTeamRegistration[];
};

export type EditionTeamRow = {
  id: string;
  schoolName: string;
  schoolCity: string;
  teamName: string;
  representativeName: string;
  representativeEmail: string;
  accountsStarted: number;
  registrationsCompleted: number;
};

export const EDITION_TEAMS_CSV_HEADERS = [
  "Scuola",
  "Città",
  "Squadra",
  "Referente",
  "Email referente",
  "Account avviati",
  "Registrazioni completate",
] as const;

export function isPlayerAccountStarted(row: EditionTeamRegistration) {
  return row.category === "PLAYER" && PLAYER_ACCOUNT_STARTED.has(row.status);
}

export function isPlayerRegistrationCompleted(row: EditionTeamRegistration) {
  return row.category === "PLAYER" && row.status === "APPROVED";
}

export function summarizeEditionTeamGroups(
  groups: Array<{ category: string; status: string; count: number }>,
) {
  let accountsStarted = 0;
  let registrationsCompleted = 0;
  for (const group of groups) {
    const row = { category: group.category, status: group.status };
    if (isPlayerAccountStarted(row)) accountsStarted += group.count;
    if (isPlayerRegistrationCompleted(row)) registrationsCompleted += group.count;
  }
  return { accountsStarted, registrationsCompleted };
}

export function summarizeEditionTeamPlayers(rows: EditionTeamRegistration[]) {
  const groups = new Map<string, { category: string; status: string; count: number }>();
  for (const row of rows) {
    const key = `${row.category}|${row.status}`;
    const current = groups.get(key) ?? { category: row.category, status: row.status, count: 0 };
    current.count += 1;
    groups.set(key, current);
  }
  return summarizeEditionTeamGroups([...groups.values()]);
}

function compareIt(a: string, b: string) {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

export type EditionTeamCountGroup = {
  teamId: string;
  category: string;
  status: string;
  count: number;
};

export function toEditionTeamRowsFromCounts(
  teams: Omit<EditionTeamSource, "registrations">[],
  groups: EditionTeamCountGroup[],
): EditionTeamRow[] {
  const byTeam = new Map<string, Array<{ category: string; status: string; count: number }>>();
  for (const group of groups) {
    const list = byTeam.get(group.teamId) ?? [];
    list.push(group);
    byTeam.set(group.teamId, list);
  }
  return teams
    .map((team) => ({
      id: team.id,
      schoolName: team.school.name.trim(),
      schoolCity: team.school.city?.trim() ?? "",
      teamName: team.name.trim(),
      representativeName: team.representative?.name?.trim() || team.contactName?.trim() || "",
      representativeEmail: team.representative?.email?.trim() || team.contactEmail?.trim() || "",
      ...summarizeEditionTeamGroups(byTeam.get(team.id) ?? []),
    }))
    .sort((a, b) => compareIt(a.schoolName, b.schoolName) || compareIt(a.teamName, b.teamName));
}

export function toEditionTeamRows(teams: EditionTeamSource[]): EditionTeamRow[] {
  return toEditionTeamRowsFromCounts(
    teams,
    teams.flatMap((team) => {
      const grouped = new Map<string, EditionTeamCountGroup>();
      for (const row of team.registrations) {
        const key = `${row.category}|${row.status}`;
        const current = grouped.get(key) ?? {
          teamId: team.id,
          category: row.category,
          status: row.status,
          count: 0,
        };
        current.count += 1;
        grouped.set(key, current);
      }
      return [...grouped.values()];
    }),
  );
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",;\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function editionTeamsToCsv(rows: EditionTeamRow[]) {
  const lines = [
    EDITION_TEAMS_CSV_HEADERS.join(";"),
    ...rows.map((row) =>
      [
        row.schoolName,
        row.schoolCity,
        row.teamName,
        row.representativeName,
        row.representativeEmail,
        String(row.accountsStarted),
        String(row.registrationsCompleted),
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function editionTeamsExportFilename(input: { competitionName: string; editionName: string; year: number }) {
  const slug = [input.competitionName, input.editionName, String(input.year)]
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${slug || "edizione"}-squadre.csv`;
}
