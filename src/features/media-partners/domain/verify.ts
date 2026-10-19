import {
  isBoxActive,
  latestAccepted,
  latestChoices,
  type ChoiceSnapshot,
  type ConsentBoxCode,
} from "@/features/consents/domain/boxes";
import { isMinor, needsMediaAgreement } from "@/features/players/domain/age";

export const MEDIA_USE_KEYS = ["channels", "promotion", "sponsor", "press", "interviews"] as const;
export type MediaUseKey = (typeof MEDIA_USE_KEYS)[number];

export type MediaConsentState =
  | "granted"
  | "denied"
  | "revoked"
  | "not_collected"
  | "not_effective"
  | "unverifiable";

export type MediaConsentReason =
  | "missing_birth_date"
  | "missing_version"
  | "publication_revoked"
  | "pending_other_parent"
  | "missing_g1"
  | "missing_g14"
  | "not_activated";

export type MediaAgeBand = "minor" | "adult" | "unverifiable";

export type MediaUseVerdict = {
  key: MediaUseKey;
  state: MediaConsentState;
  reason: MediaConsentReason | null;
};

export type MediaVerifySummary = {
  ageBand: MediaAgeBand;
  photoVideo: MediaUseVerdict;
  social: MediaUseVerdict;
  uses: MediaUseVerdict[];
  unverifiable: boolean;
};

export type MediaChoiceEvent = {
  code: string;
  accepted: boolean;
  createdAt: Date | number;
  legalDocumentVersionId?: string | null;
  value?: string | null;
};

export type MediaVerifyInput = {
  birthDate: Date | null;
  choices: MediaChoiceEvent[];
  publicationAuthorizationStatus?: string | null;
  now?: Date;
};

const USE_CODES: Record<MediaUseKey, { adult: ConsentBoxCode; minor: ConsentBoxCode }> = {
  channels: { adult: "M7", minor: "G9" },
  promotion: { adult: "M8", minor: "G10" },
  sponsor: { adult: "M9", minor: "G11" },
  press: { adult: "M10", minor: "G12" },
  interviews: { adult: "M11", minor: "G13" },
};

const HEADLINE_ORDER: MediaConsentState[] = [
  "granted",
  "unverifiable",
  "not_effective",
  "revoked",
  "denied",
  "not_collected",
];

function createdAtMs(value: Date | number) {
  return typeof value === "number" ? value : value.getTime();
}

function toSnapshots(choices: MediaChoiceEvent[]): ChoiceSnapshot[] {
  return choices.map((choice) => ({
    code: choice.code,
    accepted: choice.accepted,
    createdAt: createdAtMs(choice.createdAt),
    value: choice.value,
  }));
}

function eventsFor(choices: MediaChoiceEvent[], code: ConsentBoxCode) {
  return choices
    .filter((choice) => choice.code === code)
    .slice()
    .sort((left, right) => createdAtMs(left.createdAt) - createdAtMs(right.createdAt));
}

function effectivenessReason(input: {
  isMinor: boolean;
  needsAgreement: boolean;
  map: Map<string, ChoiceSnapshot>;
}): MediaConsentReason {
  if (!input.isMinor) return "not_activated";
  if (!latestAccepted(input.map, "G1")) return "missing_g1";
  const g3 = input.map.get("G3")?.value;
  if (g3 === "OTHER_PARENT" && !latestAccepted(input.map, "C1")) return "pending_other_parent";
  if (input.needsAgreement && !latestAccepted(input.map, "G14")) return "missing_g14";
  return "not_activated";
}

function classifyUse(input: {
  key: MediaUseKey;
  isMinor: boolean;
  needsAgreement: boolean;
  map: Map<string, ChoiceSnapshot>;
  choices: MediaChoiceEvent[];
  publicationRevoked: boolean;
}): MediaUseVerdict {
  const code = input.isMinor ? USE_CODES[input.key].minor : USE_CODES[input.key].adult;
  const events = eventsFor(input.choices, code);
  if (events.length === 0) {
    return { key: input.key, state: "not_collected", reason: null };
  }

  const latest = events[events.length - 1]!;
  const hadGrant = events.some((event) => event.accepted);
  if (!latest.accepted) {
    return { key: input.key, state: hadGrant ? "revoked" : "denied", reason: null };
  }

  if (!latest.legalDocumentVersionId) {
    return { key: input.key, state: "unverifiable", reason: "missing_version" };
  }

  if (input.publicationRevoked) {
    return { key: input.key, state: "unverifiable", reason: "publication_revoked" };
  }

  if (!isBoxActive(code, input)) {
    return {
      key: input.key,
      state: "not_effective",
      reason: effectivenessReason(input),
    };
  }

  return { key: input.key, state: "granted", reason: null };
}

function headline(uses: MediaUseVerdict[]): MediaUseVerdict {
  for (const state of HEADLINE_ORDER) {
    const match = uses.find((use) => use.state === state);
    if (match) {
      return { key: "channels", state, reason: match.reason };
    }
  }
  return { key: "channels", state: "not_collected", reason: null };
}

export function summarizeMediaAuthorization(input: MediaVerifyInput): MediaVerifySummary {
  if (!input.birthDate) {
    const unverifiable = MEDIA_USE_KEYS.map((key) => ({
      key,
      state: "unverifiable" as const,
      reason: "missing_birth_date" as const,
    }));
    const photoVideo = { key: "channels" as const, state: "unverifiable" as const, reason: "missing_birth_date" as const };
    return {
      ageBand: "unverifiable",
      photoVideo,
      social: photoVideo,
      uses: unverifiable,
      unverifiable: true,
    };
  }

  const now = input.now ?? new Date();
  const minor = isMinor(input.birthDate, now);
  const needsAgreement = needsMediaAgreement(input.birthDate, now);
  const map = latestChoices(toSnapshots(input.choices));
  const publicationRevoked = input.publicationAuthorizationStatus === "REVOKED";
  const uses = MEDIA_USE_KEYS.map((key) =>
    classifyUse({
      key,
      isMinor: minor,
      needsAgreement,
      map,
      choices: input.choices,
      publicationRevoked,
    }),
  );
  const photoVideo = headline(uses);
  const social = uses.find((use) => use.key === "channels") ?? photoVideo;

  return {
    ageBand: minor ? "minor" : "adult",
    photoVideo,
    social,
    uses,
    unverifiable: uses.some((use) => use.state === "unverifiable") || photoVideo.state === "unverifiable",
  };
}

export const MEDIA_VERIFY_DTO_KEYS = [
  "registrationId",
  "firstName",
  "lastName",
  "teamName",
  "competitionName",
  "editionName",
  "category",
  "ageBand",
  "photoVideo",
  "social",
  "uses",
  "unverifiable",
] as const;

export type MediaPlayerCard = {
  registrationId: string;
  firstName: string;
  lastName: string;
  teamName: string;
  competitionName: string;
  editionName: string;
  category: "PLAYER" | "STAFF";
  ageBand: MediaAgeBand;
  photoVideo: MediaUseVerdict;
  social: MediaUseVerdict;
  uses: MediaUseVerdict[];
  unverifiable: boolean;
};

export type MediaSearchHit = Omit<MediaPlayerCard, "uses" | "unverifiable">;

export function toMediaSearchHit(card: MediaPlayerCard): MediaSearchHit {
  return {
    registrationId: card.registrationId,
    firstName: card.firstName,
    lastName: card.lastName,
    teamName: card.teamName,
    competitionName: card.competitionName,
    editionName: card.editionName,
    category: card.category,
    ageBand: card.ageBand,
    photoVideo: card.photoVideo,
    social: card.social,
  };
}

export const MEDIA_SEARCH_MIN_LENGTH = 2;
export const MEDIA_SEARCH_LIMIT = 15;
export const MEDIA_EXCLUDED_STATUSES = ["WITHDRAWN", "REMOVED"] as const;

export function searchTokens(query: string) {
  return query
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function mediaSearchWhere(input: { query: string; competitionIds: string[] | "all" }) {
  const tokens = searchTokens(input.query);
  const joined = tokens.join(" ");
  if (joined.length < MEDIA_SEARCH_MIN_LENGTH || tokens.length === 0) return null;
  if (input.competitionIds !== "all" && input.competitionIds.length === 0) return null;

  return {
    status: { notIn: [...MEDIA_EXCLUDED_STATUSES] },
    playerProfile: {
      user: { lifecycleStatus: "ACTIVE" as const },
      AND: tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" as const } },
          { lastName: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    },
    ...(input.competitionIds === "all"
      ? {}
      : { edition: { competitionId: { in: input.competitionIds } } }),
  };
}

export function mediaCardWhere(input: { registrationId: string; competitionIds: string[] | "all" }) {
  if (input.competitionIds !== "all" && input.competitionIds.length === 0) return null;
  return {
    id: input.registrationId,
    status: { notIn: [...MEDIA_EXCLUDED_STATUSES] },
    playerProfile: { user: { lifecycleStatus: "ACTIVE" as const } },
    ...(input.competitionIds === "all"
      ? {}
      : { edition: { competitionId: { in: input.competitionIds } } }),
  };
}

const FORBIDDEN_DTO_KEYS = [
  "email",
  "phone",
  "fiscalCode",
  "birthDate",
  "storageKey",
  "guardian",
  "clauseText",
  "ipAddress",
  "userAgent",
  "legalDocumentVersionId",
] as const;

export function dtoLeaksForbiddenFields(value: unknown) {
  const json = JSON.stringify(value);
  return FORBIDDEN_DTO_KEYS.filter((key) => new RegExp(`"${key}"\\s*:`, "i").test(json));
}
