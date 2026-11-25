import { prisma } from "@/shared/lib/prisma";
import { writeAuditLog } from "@/shared/lib/audit";
import { leagueRegistrationSelect } from "@/features/league/data/select";
import {
  filterLeaguePlayers,
  leagueCompletionDate,
  leagueMedicalStatus,
  leaguePaymentStatus,
  leaguePlayersWhere,
  summarizeLeagueOverview,
  summarizeLeagueSchool,
  type LeaguePlayerFilters,
  type LeaguePlayerRecord,
  type LeagueRegistrationStatus,
} from "@/features/league/domain/status";

type LeagueRegistrationRow = {
  id: string;
  status: string;
  reviewedAt: Date | null;
  category: string;
  editionId: string;
  team: {
    id: string;
    name: string;
    schoolId: string;
    school: { id: string; name: string; city: string | null };
    edition: {
      id: string;
      name: string;
      paymentMode: "PLAYER" | "TEAM" | "BOTH";
      competition: { name: string };
    };
    payments: { id: string }[];
  };
  playerProfile: { firstName: string; lastName: string };
  documents: { status: string; expiresAt: Date | null }[];
  payments: { status: string }[];
};

function toPlayerRecords(rows: LeagueRegistrationRow[]): LeaguePlayerRecord[] {
  const teamsBySchool = new Map<string, Set<string>>();
  for (const row of rows) {
    const names = teamsBySchool.get(row.team.schoolId) ?? new Set<string>();
    names.add(row.team.name);
    teamsBySchool.set(row.team.schoolId, names);
  }
  return rows.map((row) => {
    const teamNames = teamsBySchool.get(row.team.schoolId) ?? new Set<string>();
    const medical = row.documents[0];
    return {
      registrationId: row.id,
      firstName: row.playerProfile.firstName,
      lastName: row.playerProfile.lastName,
      schoolId: row.team.schoolId,
      schoolName: row.team.school.name,
      teamName: row.team.name,
      teamCountInSchool: teamNames.size,
      registrationStatus: row.status as LeagueRegistrationStatus,
      medicalStatus: leagueMedicalStatus(medical?.status, medical?.expiresAt),
      paymentStatus: leaguePaymentStatus({
        paymentMode: row.team.edition.paymentMode,
        playerSucceeded: row.payments.some((payment) => payment.status === "SUCCEEDED"),
        teamSucceeded: row.team.payments.length > 0,
      }),
      completedAt: leagueCompletionDate(row.status, row.reviewedAt),
    };
  });
}

async function loadEditionRegistrations(editionId: string) {
  return prisma.registration.findMany({
    where: leaguePlayersWhere(editionId),
    select: leagueRegistrationSelect,
    orderBy: [{ playerProfile: { lastName: "asc" } }, { playerProfile: { firstName: "asc" } }],
  }) as Promise<LeagueRegistrationRow[]>;
}

export async function getLeagueEdition(editionId: string) {
  return prisma.edition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      name: true,
      year: true,
      paymentMode: true,
      competition: { select: { name: true } },
    },
  });
}

export async function listLeagueWorkspace(editionId: string, filters: LeaguePlayerFilters = {}) {
  const [edition, registrations] = await Promise.all([
    getLeagueEdition(editionId),
    loadEditionRegistrations(editionId),
  ]);
  const players = toPlayerRecords(registrations);
  const schoolMap = new Map<string, { schoolId: string; schoolName: string; city: string; teamNames: Set<string>; players: LeaguePlayerRecord[] }>();
  for (const row of registrations) {
    const current = schoolMap.get(row.team.schoolId) ?? {
      schoolId: row.team.schoolId,
      schoolName: row.team.school.name,
      city: row.team.school.city ?? "",
      teamNames: new Set<string>(),
      players: [],
    };
    current.teamNames.add(row.team.name);
    schoolMap.set(row.team.schoolId, current);
  }
  for (const player of players) {
    schoolMap.get(player.schoolId)?.players.push(player);
  }
  const emptySchools = await prisma.team.findMany({
    where: { editionId },
    select: { name: true, school: { select: { id: true, name: true, city: true } } },
  });
  for (const team of emptySchools) {
    if (schoolMap.has(team.school.id)) {
      schoolMap.get(team.school.id)?.teamNames.add(team.name);
      continue;
    }
    schoolMap.set(team.school.id, {
      schoolId: team.school.id,
      schoolName: team.school.name,
      city: team.school.city ?? "",
      teamNames: new Set([team.name]),
      players: [],
    });
  }
  const schools = [...schoolMap.values()]
    .map((school) =>
      summarizeLeagueSchool(
        {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          city: school.city,
          teamNames: [...school.teamNames],
        },
        school.players,
      ),
    )
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName, "it", { sensitivity: "base" }));
  const filteredPlayers = filterLeaguePlayers(players, filters);
  return {
    edition,
    schools,
    players: filteredPlayers,
    allPlayers: players,
    overview: summarizeLeagueOverview(schools, players),
  };
}

async function denyLeagueAccess(
  actorUserId: string,
  entityType: "School" | "Registration",
  entityId: string,
  editionId: string,
) {
  await writeAuditLog({
    actorUserId,
    actorRole: "LEAGUE_SUPERVISOR",
    action: "LEAGUE_ACCESS_DENIED",
    entityType,
    entityId,
    metadata: { editionId },
  });
}

export async function getLeagueSchool(
  editionId: string,
  schoolId: string,
  actorUserId: string,
  filters: LeaguePlayerFilters = {},
) {
  const [edition, registrations, teams] = await Promise.all([
    getLeagueEdition(editionId),
    prisma.registration.findMany({
      where: { ...leaguePlayersWhere(editionId), team: { schoolId } },
      select: leagueRegistrationSelect,
      orderBy: [{ playerProfile: { lastName: "asc" } }, { playerProfile: { firstName: "asc" } }],
    }) as Promise<LeagueRegistrationRow[]>,
    prisma.team.findMany({
      where: { editionId, schoolId },
      select: { name: true, school: { select: { id: true, name: true, city: true } } },
    }),
  ]);
  if (registrations.length === 0 && teams.length === 0) {
    await denyLeagueAccess(actorUserId, "School", schoolId, editionId);
    return null;
  }
  const players = toPlayerRecords(registrations);
  const teamNames = new Set<string>();
  for (const row of registrations) teamNames.add(row.team.name);
  for (const team of teams) teamNames.add(team.name);
  const schoolRow = registrations[0]?.team.school ?? teams[0]?.school;
  if (!schoolRow) {
    await denyLeagueAccess(actorUserId, "School", schoolId, editionId);
    return null;
  }
  const school = summarizeLeagueSchool(
    {
      schoolId: schoolRow.id,
      schoolName: schoolRow.name,
      city: schoolRow.city ?? "",
      teamNames: [...teamNames],
    },
    players,
  );
  const filteredPlayers = filterLeaguePlayers(players, { ...filters, schoolId });
  return {
    edition,
    schools: [school],
    players: filteredPlayers,
    allPlayers: players,
    overview: summarizeLeagueOverview([school], players),
    school,
  };
}

export async function getLeaguePlayer(editionId: string, registrationId: string, actorUserId: string) {
  const row = (await prisma.registration.findFirst({
    where: { id: registrationId, ...leaguePlayersWhere(editionId) },
    select: leagueRegistrationSelect,
  })) as LeagueRegistrationRow | null;
  if (!row) {
    await denyLeagueAccess(actorUserId, "Registration", registrationId, editionId);
    return null;
  }
  const [edition, schoolTeams] = await Promise.all([
    getLeagueEdition(editionId),
    prisma.registration.findMany({
      where: { ...leaguePlayersWhere(editionId), team: { schoolId: row.team.schoolId } },
      distinct: ["teamId"],
      orderBy: { teamId: "asc" },
      select: { teamId: true, team: { select: { name: true } } },
    }),
  ]);
  const teamCountInSchool = new Set(schoolTeams.map((item) => item.team.name)).size;
  const player = {
    ...toPlayerRecords([row])[0]!,
    teamCountInSchool,
  };
  const school = summarizeLeagueSchool(
    {
      schoolId: row.team.schoolId,
      schoolName: row.team.school.name,
      city: row.team.school.city ?? "",
      teamNames: [...new Set(schoolTeams.map((item) => item.team.name))],
    },
    [player],
  );
  return {
    edition,
    schools: [school],
    players: [player],
    allPlayers: [player],
    overview: summarizeLeagueOverview([school], [player]),
    player,
    school,
  };
}
