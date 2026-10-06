import { createInviteToken, hashInviteToken, isWellFormedInviteToken } from "@/features/teams/domain/token";
import { appendBoxSet } from "@/features/consents/data/choices";
import { getCurrentLegalVersions, recordConsent } from "@/features/consents/data/legal";
import { privacySlugsFor, MEDIA_RELEASE_SLUG } from "@/features/consents/domain/pack";
import {
  ENROLLMENT_REQUIRED_CODES,
  enrollmentBoxCodes,
  inspectGuardianLink,
  isOpenAuthorizationStatus,
  publicationBoxCodes,
  revokeBoxCodes,
  type GuardianLinkPurpose,
} from "@/features/consents/domain/guardianAuth";
import type { ConsentBoxCode, G3Value } from "@/features/consents/domain/boxes";
import { dispatchConsentReceiptIfComplete } from "@/features/consents/data/receipt";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { GUARDIAN_LINK_DAYS, GUARDIAN_REMINDER_DAYS, appOrigin } from "@/shared/config/app";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import { it } from "@/shared/i18n/it";
import type { ActorKind, GuardianAuthorizationType } from "@generated/client";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function formatExpiry(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function clauseFor(code: ConsentBoxCode) {
  return it[`box${code}`];
}

export function guardianAuthorizeUrl(token: string) {
  return `${appOrigin()}/autorizzazione-genitore/${encodeURIComponent(token)}`;
}

export function guardianRevokeUrl(token: string) {
  return `${appOrigin()}/revoca-genitore/${encodeURIComponent(token)}`;
}

async function invalidateUnusedTokens(input: {
  registrationId: string;
  purpose: GuardianLinkPurpose;
  guardianId?: string;
}) {
  await prisma.guardianLinkToken.updateMany({
    where: {
      registrationId: input.registrationId,
      purpose: input.purpose,
      usedAt: null,
      ...(input.guardianId ? { guardianId: input.guardianId } : {}),
    },
    data: { usedAt: new Date() },
  });
}

async function issueLinkToken(input: {
  purpose: GuardianLinkPurpose;
  guardianId: string;
  playerProfileId: string;
  registrationId: string;
  authorizationId: string;
}) {
  await invalidateUnusedTokens({
    registrationId: input.registrationId,
    purpose: input.purpose,
    guardianId: input.guardianId,
  });
  const token = createInviteToken();
  const row = await prisma.guardianLinkToken.create({
    data: {
      tokenHash: hashInviteToken(token),
      purpose: input.purpose,
      guardianId: input.guardianId,
      playerProfileId: input.playerProfileId,
      registrationId: input.registrationId,
      authorizationId: input.authorizationId,
      expiresAt: daysFromNow(GUARDIAN_LINK_DAYS),
    },
  });
  return { token, row };
}

export async function requestEnrollmentAuthorization(input: {
  registrationId: string;
  playerProfileId: string;
  playerUserId: string;
  guardianId: string;
  guardianEmail: string;
  playerName: string;
  tournamentName: string;
}) {
  const current = await prisma.guardianAuthorization.findFirst({
    where: {
      registrationId: input.registrationId,
      guardianId: input.guardianId,
      authorizationType: "ENROLLMENT",
      status: { in: ["PENDING", "OPENED", "AUTHORIZED"] },
    },
    orderBy: { requestedAt: "desc" },
  });
  if (current?.status === "AUTHORIZED") {
    return { ok: true as const, authorizationId: current.id, reused: true as const };
  }

  await prisma.guardianAuthorization.updateMany({
    where: {
      registrationId: input.registrationId,
      authorizationType: "ENROLLMENT",
      status: { in: ["PENDING", "OPENED"] },
    },
    data: { status: "SUPERSEDED" },
  });

  const versions = await getCurrentLegalVersions([...privacySlugsFor(true), MEDIA_RELEASE_SLUG]);
  const terms = versions.find((row) => row.legalDocument.slug === "terms");

  const authorization = await prisma.guardianAuthorization.create({
    data: {
      guardianId: input.guardianId,
      playerProfileId: input.playerProfileId,
      registrationId: input.registrationId,
      authorizationType: "ENROLLMENT",
      status: "PENDING",
      legalDocumentVersionId: terms?.id ?? null,
    },
  });

  const issued = await issueLinkToken({
    purpose: "AUTHORIZE",
    guardianId: input.guardianId,
    playerProfileId: input.playerProfileId,
    registrationId: input.registrationId,
    authorizationId: authorization.id,
  });
  await prisma.guardianAuthorization.update({
    where: { id: authorization.id },
    data: { tokenId: issued.row.id },
  });

  const expires = formatExpiry(issued.row.expiresAt);
  await dispatchOutboundEmail({
    idempotencyKey: `guardian-authorize:${issued.row.id}`,
    purpose: "GUARDIAN_AUTHORIZE",
    templateKey: "GUARDIAN_AUTHORIZE",
    to: input.guardianEmail,
    userId: input.playerUserId,
    recipientKind: "GUARDIAN",
    variables: {
      title: it.emailGuardianAuthorizeSubject,
      playerName: input.playerName,
      teamName: input.tournamentName,
      confirmUrl: guardianAuthorizeUrl(issued.token),
      scadenza: expires,
      summary: it.emailGuardianAuthorizeSummary,
    },
    sourceEntityType: "GuardianAuthorization",
    sourceEntityId: authorization.id,
  });

  await writeAuditLog({
    actorKind: "SYSTEM",
    action: "GUARDIAN_REQUEST",
    entityType: "GuardianAuthorization",
    entityId: authorization.id,
    guardianId: input.guardianId,
    authorizationId: authorization.id,
    metadata: { type: "ENROLLMENT", playerUserId: input.playerUserId },
  });

  return { ok: true as const, authorizationId: authorization.id, reused: false as const };
}

export async function requestPublicationAuthorization(input: {
  registrationId: string;
  playerProfileId: string;
  playerUserId: string;
  guardianId: string;
  guardianEmail: string;
  playerName: string;
  tournamentName: string;
}) {
  const existing = await prisma.guardianAuthorization.findFirst({
    where: {
      registrationId: input.registrationId,
      guardianId: input.guardianId,
      authorizationType: "PUBLICATION",
      status: { in: ["PENDING", "OPENED", "AUTHORIZED"] },
    },
    orderBy: { requestedAt: "desc" },
  });
  if (existing?.status === "AUTHORIZED") {
    return { ok: true as const, authorizationId: existing.id };
  }
  if (existing && isOpenAuthorizationStatus(existing.status)) {
    const live = await prisma.guardianLinkToken.findFirst({
      where: {
        authorizationId: existing.id,
        purpose: "PUBLICATION",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (live) return { ok: true as const, authorizationId: existing.id };
  }

  await prisma.guardianAuthorization.updateMany({
    where: {
      registrationId: input.registrationId,
      guardianId: input.guardianId,
      authorizationType: "PUBLICATION",
      status: { in: ["PENDING", "OPENED"] },
    },
    data: { status: "SUPERSEDED" },
  });

  const versions = await getCurrentLegalVersions([MEDIA_RELEASE_SLUG]);
  const authorization = await prisma.guardianAuthorization.create({
    data: {
      guardianId: input.guardianId,
      playerProfileId: input.playerProfileId,
      registrationId: input.registrationId,
      authorizationType: "PUBLICATION",
      status: "PENDING",
      legalDocumentVersionId: versions[0]?.id ?? null,
    },
  });
  const issued = await issueLinkToken({
    purpose: "PUBLICATION",
    guardianId: input.guardianId,
    playerProfileId: input.playerProfileId,
    registrationId: input.registrationId,
    authorizationId: authorization.id,
  });
  await prisma.guardianAuthorization.update({
    where: { id: authorization.id },
    data: { tokenId: issued.row.id },
  });
  await dispatchOutboundEmail({
    idempotencyKey: `guardian-publication:${issued.row.id}`,
    purpose: "CONSENT_C1",
    templateKey: "CONSENT_C1",
    to: input.guardianEmail,
    userId: input.playerUserId,
    recipientKind: "GUARDIAN",
    variables: {
      title: it.emailC1Subject,
      playerName: input.playerName,
      confirmUrl: guardianAuthorizeUrl(issued.token),
      scadenza: formatExpiry(issued.row.expiresAt),
      summary: it.emailPublicationSummary,
    },
    sourceEntityType: "GuardianAuthorization",
    sourceEntityId: authorization.id,
  });
  return { ok: true as const, authorizationId: authorization.id };
}

export async function loadGuardianLink(token: string, purpose: GuardianLinkPurpose) {
  if (!isWellFormedInviteToken(token)) return null;
  const row = await prisma.guardianLinkToken.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      authorization: true,
      guardian: true,
      registration: {
        include: {
          team: { include: { edition: { include: { competition: true } } } },
          playerProfile: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });
  if (!row || row.purpose !== purpose) return null;
  const stale = inspectGuardianLink({
    purpose,
    usedAt: row.usedAt,
    expiresAt: row.expiresAt,
    authorization: row.authorization,
  });
  return { ...row, stale };
}

export async function markGuardianLinkOpened(tokenId: string, authorizationId: string, ip?: string | null, userAgent?: string | null) {
  const current = await prisma.guardianAuthorization.findUnique({ where: { id: authorizationId } });
  if (!current) return;
  if (current.status === "PENDING") {
    await prisma.guardianAuthorization.update({
      where: { id: authorizationId },
      data: { status: "OPENED", openedAt: new Date(), ipAddress: ip ?? current.ipAddress, userAgent: userAgent ?? current.userAgent },
    });
  }
  await prisma.guardianLinkToken.update({
    where: { id: tokenId },
    data: { ipAddress: ip ?? null, userAgent: userAgent ?? null },
  });
}

export async function submitGuardianAuthorization(input: {
  token: string;
  purpose: "AUTHORIZE" | "PUBLICATION";
  refuse: boolean;
  g3?: G3Value | null;
  boxes: Array<{ code: ConsentBoxCode; accepted: boolean }>;
  versionIds: Record<string, string>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const found = await loadGuardianLink(input.token, input.purpose);
  if (!found) return { ok: false as const, reason: "invalid" as const };
  if (found.stale === "used") return { ok: false as const, reason: "used" as const };
  if (found.stale) return { ok: false as const, reason: "invalid" as const };
  const authorization = found.authorization;
  if (!authorization) return { ok: false as const, reason: "invalid" as const };

  const expectedType: GuardianAuthorizationType = input.purpose === "PUBLICATION" ? "PUBLICATION" : "ENROLLMENT";
  if (authorization.authorizationType !== expectedType) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const playerUserId = found.registration.playerProfile.userId;
  const partnersPublished = await isPartnerBoxVisible();
  const allowedCodes = new Set(
    expectedType === "PUBLICATION" ? publicationBoxCodes(partnersPublished) : enrollmentBoxCodes(partnersPublished),
  );
  const submitted = input.boxes.filter((box) => allowedCodes.has(box.code));

  if (!input.refuse && expectedType === "ENROLLMENT") {
    const accepted = new Map(submitted.map((box) => [box.code, box.accepted]));
    if (ENROLLMENT_REQUIRED_CODES.some((code) => !accepted.get(code))) {
      return { ok: false as const, reason: "required" as const };
    }
  }

  const slugs = expectedType === "PUBLICATION" ? [MEDIA_RELEASE_SLUG] : [...privacySlugsFor(true), MEDIA_RELEASE_SLUG];
  const actorKind: ActorKind = "GUARDIAN_LINK";
  const actorRole = "GUARDIAN";

  if (!input.refuse) {
    for (const slug of slugs) {
      const versionId = input.versionIds[slug];
      if (!versionId) continue;
      const stored = await recordConsent({
        userId: playerUserId,
        registrationId: found.registrationId,
        versionId,
        consentType: slug === MEDIA_RELEASE_SLUG ? "OPTIONAL" : "REQUIRED",
        accepted: true,
        guardianId: found.guardianId,
        actorKind,
        actorRole,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      if (!stored.ok) return { ok: false as const, reason: "stale" as const };
      await writeAuditLog({
        actorKind,
        actorRole,
        guardianId: found.guardianId,
        authorizationId: authorization.id,
        legalDocumentVersionId: versionId,
        action: "CONSENT_ACCEPT",
        entityType: "ConsentRecord",
        entityId: stored.record.id,
        metadata: { slug: stored.slug, version: stored.version, via: "guardian_link" },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    }
  }

  const g3Value = expectedType === "ENROLLMENT" ? input.g3 ?? null : null;
  const boxesToStore = submitted.map((box) => ({
    ...box,
    value: box.code === "G3" ? g3Value : undefined,
    clauseText: clauseFor(box.code),
  }));
  if (g3Value && !boxesToStore.some((box) => box.code === "G3")) {
    boxesToStore.push({ code: "G3", accepted: true, value: g3Value, clauseText: clauseFor("G3") });
  }

  await appendBoxSet({
    userId: playerUserId,
    registrationId: found.registrationId,
    guardianId: found.guardianId,
    source: "GUARDIAN_LINK",
    actorKind,
    actorRole,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    boxes: input.refuse
      ? boxesToStore.map((box) => ({
          ...box,
          accepted: false,
        }))
      : boxesToStore,
  });

  await prisma.guardianAuthorizationDecision.createMany({
    data: (input.refuse ? boxesToStore.map((box) => ({ ...box, accepted: false })) : boxesToStore).map((box) => ({
      authorizationId: authorization.id,
      code: box.code,
      accepted: box.accepted,
      clauseText: box.clauseText,
      legalDocumentVersionId: input.versionIds.terms ?? input.versionIds[MEDIA_RELEASE_SLUG] ?? null,
    })),
  });

  const status = input.refuse ? "REFUSED" : "AUTHORIZED";
  await prisma.guardianAuthorization.update({
    where: { id: authorization.id },
    data: {
      status,
      authorizedAt: input.refuse ? null : new Date(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  await prisma.guardianLinkToken.update({
    where: { id: found.id },
    data: { usedAt: new Date(), ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null },
  });

  await writeAuditLog({
    actorKind,
    actorRole,
    guardianId: found.guardianId,
    authorizationId: authorization.id,
    action: input.refuse ? "GUARDIAN_REFUSE" : "GUARDIAN_AUTHORIZE",
    entityType: "GuardianAuthorization",
    entityId: authorization.id,
    metadata: { type: expectedType, refused: input.refuse },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const playerName = `${found.registration.playerProfile.firstName} ${found.registration.playerProfile.lastName}`.trim();
  const tournamentName = found.registration.team.edition.competition.name;

  if (input.refuse) {
    await prisma.notification.create({
      data: {
        userId: playerUserId,
        type: "GUARDIAN_REFUSED",
        title: it.notifyGuardianRefusedTitle,
        body: it.notifyGuardianRefusedBody,
        metadata: { registrationId: found.registrationId },
      },
    });
    await dispatchOutboundEmail({
      idempotencyKey: `guardian-refused:${authorization.id}`,
      purpose: "GUARDIAN_REFUSED",
      templateKey: "GUARDIAN_REFUSED",
      to: found.registration.playerProfile.user.email,
      userId: playerUserId,
      recipientKind: "USER",
      variables: {
        title: it.emailGuardianRefusedSubject,
        playerName,
        summary: it.emailGuardianRefusedSummary,
      },
      sourceEntityType: "GuardianAuthorization",
      sourceEntityId: authorization.id,
    });
  } else {
    const revokeIssued = await issueLinkToken({
      purpose: "REVOKE",
      guardianId: found.guardianId,
      playerProfileId: found.playerProfileId,
      registrationId: found.registrationId,
      authorizationId: authorization.id,
    });
    await dispatchOutboundEmail({
      idempotencyKey: `guardian-authorized:${authorization.id}`,
      purpose: "GUARDIAN_AUTHORIZED",
      templateKey: "GUARDIAN_AUTHORIZED",
      to: found.guardian.email,
      userId: playerUserId,
      recipientKind: "GUARDIAN",
      variables: {
        title: it.emailGuardianAuthorizedSubject,
        playerName,
        teamName: tournamentName,
        confirmUrl: guardianRevokeUrl(revokeIssued.token),
        summary: it.emailGuardianAuthorizedSummary,
      },
      sourceEntityType: "GuardianAuthorization",
      sourceEntityId: authorization.id,
    });

    if (expectedType === "ENROLLMENT" && g3Value === "OTHER_PARENT") {
      const secondary = await prisma.guardian.findFirst({
        where: { playerProfileId: found.playerProfileId, kind: "SECONDARY" },
      });
      if (secondary?.email) {
        await requestPublicationAuthorization({
          registrationId: found.registrationId,
          playerProfileId: found.playerProfileId,
          playerUserId,
          guardianId: secondary.id,
          guardianEmail: secondary.email,
          playerName,
          tournamentName,
        });
      }
    }
    if (expectedType === "ENROLLMENT" && g3Value === "SOLE") {
      await prisma.guardianLinkToken.updateMany({
        where: { registrationId: found.registrationId, purpose: "PUBLICATION", usedAt: null },
        data: { usedAt: new Date() },
      });
    }
  }

  const workspace = await loadPlayerWorkspace(playerUserId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
    if (!input.refuse) {
      await dispatchConsentReceiptIfComplete({
        userId: playerUserId,
        registrationId: found.registrationId,
        isMinor: true,
        mediaApplies: true,
        mediaRequired: workspace.checklist.find((item) => item.code === "MEDIA_RELEASE")?.required ?? false,
      });
    }
  }

  return { ok: true as const, registrationUserId: playerUserId, registrationId: found.registrationId, refused: input.refuse };
}

export async function submitGuardianRevocation(input: {
  token: string;
  codes: ConsentBoxCode[];
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const found = await loadGuardianLink(input.token, "REVOKE");
  if (!found) return { ok: false as const, reason: "invalid" as const };
  if (found.stale === "used") return { ok: false as const, reason: "used" as const };
  if (found.stale) return { ok: false as const, reason: "invalid" as const };
  const authorization = found.authorization;
  if (!authorization || authorization.status !== "AUTHORIZED") {
    return { ok: false as const, reason: "invalid" as const };
  }

  const partnersPublished = true;
  const allowed = new Set(revokeBoxCodes(partnersPublished));
  const codes = input.codes.filter((code) => allowed.has(code));
  if (codes.length === 0) return { ok: false as const, reason: "required" as const };

  const playerUserId = found.registration.playerProfile.userId;
  await appendBoxSet({
    userId: playerUserId,
    registrationId: found.registrationId,
    guardianId: found.guardianId,
    source: "REVOKE",
    actorKind: "GUARDIAN_LINK",
    actorRole: "GUARDIAN",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    boxes: codes.map((code) => ({
      code,
      accepted: false,
      clauseText: clauseFor(code),
    })),
  });
  await prisma.guardianAuthorizationDecision.createMany({
    data: codes.map((code) => ({
      authorizationId: authorization.id,
      code,
      accepted: false,
      clauseText: clauseFor(code),
    })),
  });
  await prisma.guardianAuthorization.update({
    where: { id: authorization.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  await prisma.guardianLinkToken.update({
    where: { id: found.id },
    data: { usedAt: new Date(), ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null },
  });
  await writeAuditLog({
    actorKind: "GUARDIAN_LINK",
    actorRole: "GUARDIAN",
    guardianId: found.guardianId,
    authorizationId: authorization.id,
    action: "CONSENT_REVOKE",
    entityType: "GuardianAuthorization",
    entityId: authorization.id,
    metadata: { codes: codes.join(",") },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await notifyMediaRevocation({
    registrationId: found.registrationId,
    playerUserId,
    playerName: `${found.registration.playerProfile.firstName} ${found.registration.playerProfile.lastName}`.trim(),
    codes,
  });

  const workspace = await loadPlayerWorkspace(playerUserId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }

  return { ok: true as const, registrationUserId: playerUserId, codes };
}

export async function notifyMediaRevocation(input: {
  registrationId: string;
  playerUserId: string;
  playerName: string;
  codes: string[];
}) {
  const channels = input.codes
    .map((code) => it[`box${code as ConsentBoxCode}`] ?? code)
    .join("; ");
  const staff = await prisma.userRole.findMany({
    where: { role: { in: ["ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
    select: { userId: true, user: { select: { email: true } } },
  });
  for (const row of staff) {
    await prisma.notification.create({
      data: {
        userId: row.userId,
        type: "MEDIA_REVOKE_INTERNAL",
        title: it.notifyMediaRevokeTitle,
        body: `${input.playerName}: ${channels}`,
        metadata: { registrationId: input.registrationId, codes: input.codes.join(",") },
      },
    });
    if (row.user.email) {
      await dispatchOutboundEmail({
        idempotencyKey: `media-revoke:${input.registrationId}:${row.userId}:${input.codes.join(",")}`,
        purpose: "MEDIA_REVOKE_INTERNAL",
        templateKey: "MEDIA_REVOKE_INTERNAL",
        to: row.user.email,
        userId: row.userId,
        recipientKind: "USER",
        variables: {
          title: it.emailMediaRevokeSubject,
          playerName: input.playerName,
          summary: channels,
        },
        sourceEntityType: "Registration",
        sourceEntityId: input.registrationId,
      });
    }
  }
}

export async function maybeSendGuardianReminder(registrationId: string) {
  const pending = await prisma.guardianLinkToken.findFirst({
    where: {
      registrationId,
      purpose: { in: ["AUTHORIZE", "PUBLICATION"] },
      usedAt: null,
      reminderSentAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      guardian: true,
      authorization: true,
      registration: {
        include: {
          playerProfile: { select: { firstName: true, lastName: true, userId: true } },
          team: { include: { edition: { include: { competition: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pending?.authorization || !isOpenAuthorizationStatus(pending.authorization.status)) return;
  const due = pending.createdAt.getTime() + GUARDIAN_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() < due) return;

  const issued = await issueLinkToken({
    purpose: pending.purpose as GuardianLinkPurpose,
    guardianId: pending.guardianId,
    playerProfileId: pending.playerProfileId,
    registrationId,
    authorizationId: pending.authorizationId!,
  });
  await prisma.guardianLinkToken.update({
    where: { id: pending.id },
    data: { reminderSentAt: new Date(), usedAt: new Date() },
  });
  await prisma.guardianAuthorization.update({
    where: { id: pending.authorizationId! },
    data: { tokenId: issued.row.id },
  });
  const playerName = `${pending.registration.playerProfile.firstName} ${pending.registration.playerProfile.lastName}`.trim();
  await dispatchOutboundEmail({
    idempotencyKey: `guardian-reminder:${issued.row.id}`,
    purpose: pending.purpose === "PUBLICATION" ? "CONSENT_C1" : "GUARDIAN_AUTHORIZE",
    templateKey: pending.purpose === "PUBLICATION" ? "CONSENT_C1" : "GUARDIAN_AUTHORIZE",
    to: pending.guardian.email,
    userId: pending.registration.playerProfile.userId,
    recipientKind: "GUARDIAN",
    variables: {
      title: it.emailGuardianAuthorizeSubject,
      playerName,
      confirmUrl: guardianAuthorizeUrl(issued.token),
      scadenza: formatExpiry(issued.row.expiresAt),
      summary: it.emailGuardianReminderSummary,
    },
    sourceEntityType: "GuardianAuthorization",
    sourceEntityId: pending.authorizationId,
  });
}

export async function latestEnrollmentAuthorization(registrationId: string) {
  return prisma.guardianAuthorization.findFirst({
    where: { registrationId, authorizationType: "ENROLLMENT" },
    orderBy: { requestedAt: "desc" },
  });
}
