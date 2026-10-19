import type { Actor } from "@/shared/authz/types";
import { prisma } from "@/shared/lib/prisma";
import {
  MEDIA_SEARCH_LIMIT,
  mediaCardWhere,
  mediaSearchWhere,
  summarizeMediaAuthorization,
  toMediaSearchHit,
  type MediaPlayerCard,
  type MediaSearchHit,
} from "@/features/media-partners/domain/verify";

const registrationSelect = {
  id: true,
  category: true,
  playerProfile: {
    select: {
      firstName: true,
      lastName: true,
      birthDate: true,
      authorizations: {
        where: { authorizationType: "PUBLICATION" as const },
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { status: true },
      },
    },
  },
  team: { select: { name: true } },
  edition: {
    select: {
      name: true,
      competitionId: true,
      competition: { select: { name: true } },
    },
  },
  consentChoices: {
    select: {
      code: true,
      accepted: true,
      createdAt: true,
      value: true,
      legalDocumentVersionId: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export function mediaCompetitionScope(actor: Actor): string[] | "all" | null {
  if (actor.roles.some((role) => role.role === "SUPER_ADMIN")) return "all";
  if (!actor.mediaPartner) return null;
  if (actor.mediaPartner.accountStatus !== "ACTIVE" || actor.mediaPartner.organizationStatus !== "ACTIVE") {
    return null;
  }
  if (actor.mediaPartner.competitionIds.length === 0) return null;
  return actor.mediaPartner.competitionIds;
}

function toCard(row: {
  id: string;
  category: "PLAYER" | "STAFF";
  playerProfile: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    authorizations: { status: string }[];
  };
  team: { name: string };
  edition: { name: string; competition: { name: string } };
  consentChoices: Array<{
    code: string;
    accepted: boolean;
    createdAt: Date;
    value: string | null;
    legalDocumentVersionId: string | null;
  }>;
}): MediaPlayerCard {
  const summary = summarizeMediaAuthorization({
    birthDate: row.playerProfile.birthDate,
    choices: row.consentChoices,
    publicationAuthorizationStatus: row.playerProfile.authorizations[0]?.status ?? null,
  });
  return {
    registrationId: row.id,
    firstName: row.playerProfile.firstName,
    lastName: row.playerProfile.lastName,
    teamName: row.team.name,
    competitionName: row.edition.competition.name,
    editionName: row.edition.name,
    category: row.category,
    ageBand: summary.ageBand,
    photoVideo: summary.photoVideo,
    social: summary.social,
    uses: summary.uses,
    unverifiable: summary.unverifiable,
  };
}

export async function searchMediaPlayers(input: {
  query: string;
  competitionIds: string[] | "all";
}): Promise<MediaSearchHit[]> {
  const where = mediaSearchWhere(input);
  if (!where) return [];
  const rows = await prisma.registration.findMany({
    where,
    select: registrationSelect,
    orderBy: [{ playerProfile: { lastName: "asc" } }, { playerProfile: { firstName: "asc" } }],
    take: MEDIA_SEARCH_LIMIT,
  });
  return rows.map((row) => toMediaSearchHit(toCard(row)));
}

export async function loadMediaPlayerCard(input: {
  registrationId: string;
  competitionIds: string[] | "all";
}): Promise<{ card: MediaPlayerCard; competitionId: string } | null> {
  const where = mediaCardWhere(input);
  if (!where) return null;
  const row = await prisma.registration.findFirst({
    where,
    select: {
      ...registrationSelect,
      edition: {
        select: {
          name: true,
          competitionId: true,
          competition: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;
  return { card: toCard(row), competitionId: row.edition.competitionId };
}
