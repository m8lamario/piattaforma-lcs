import { Prisma } from "@generated/client";
import { isMinor, needsMediaAgreement } from "@/features/players/domain/age";
import { notifyRegistrationApproved } from "@/features/notifications/data/notifications";
import {
  classifyFiscalIdentity,
  classifyOccupiedFiscalCode,
  clearIdentityConflict,
  holderFromProfile,
  publicIdentityErrorCode,
  shouldPersistIdentityBlock,
  workspaceIdentityBlock,
  writeIdentityConflict,
} from "@/features/players/domain/identity";
import { normalizeFiscalCode } from "@/features/players/domain/fiscalCode";
import {
  hasCompletePersonalData,
  hasIdentityPersonalData,
  hasMinorGuardianRequirement,
} from "@/features/players/domain/personal";
import { isValidShirtSize } from "@/features/players/domain/shirtSize";
import {
  DEFAULT_EDITION_REQUIREMENTS,
  isTerminalRegistrationStatus,
  projectChecklist,
  projectRegistrationStatus,
  type EditionRequirement,
  type MedicalEvidence,
  type RegistrationEvidence,
  type RegistrationStatus,
} from "@/features/registrations/domain/requirements";
import {
  isPrivacyPackComplete,
  mediaDecisionFrom,
  type CurrentConsent,
} from "@/features/consents/domain/pack";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import {
  g3Value,
  latestChoices,
  marketingConfirmed,
  mediaBoxesRecorded,
  privacyBoxesComplete,
  publicationFlags,
} from "@/features/consents/domain/boxes";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { isMedicalExpired } from "@/features/documents/domain/retention";

function medicalFromStatus(status: string | undefined, expiresAt?: Date | null): MedicalEvidence {
  if (status === "APPROVED" && isMedicalExpired(expiresAt ?? null)) return "expired";
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    case "UPLOADED":
    case "PENDING_REVIEW":
      return "pending";
    default:
      return "none";
  }
}

export async function loadPlayerWorkspace(userId: string) {
  const [user, profile, registration] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    }),
    prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        fiscalCode: true,
        phone: true,
        shirtSize: true,
        metadata: true,
      },
    }),
    prisma.registration.findFirst({
      where: { playerProfile: { userId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, teamId: true, editionId: true, category: true },
    }),
  ]);

  if (!user || !profile || !registration) {
    return null;
  }

  const registrationId = registration.id;
  const [
    team,
    edition,
    competition,
    requirementRows,
    teamPayment,
    guardians,
    documents,
    documentTypes,
    reviews,
    payments,
    consentRecords,
    legalVersions,
    legalDocuments,
    consentChoices,
    consentTokens,
    authorizations,
    partnersPublished,
  ] = await Promise.all([
    prisma.team.findUnique({ where: { id: registration.teamId }, select: { id: true, name: true } }),
    prisma.edition.findUnique({
      where: { id: registration.editionId },
      select: {
        name: true,
        paymentMode: true,
        currency: true,
        playerFeeAmount: true,
        teamFeeAmount: true,
        staffFeeAmount: true,
        isActive: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
      },
    }),
    prisma.competition.findFirst({
      where: { editions: { some: { id: registration.editionId } } },
      select: { name: true },
    }),
    prisma.editionRequirement.findMany({
      where: { editionId: registration.editionId },
      select: { code: true, required: true, appliesTo: true },
    }),
    prisma.payment.findFirst({
      where: { teamId: registration.teamId, registrationId: null, status: "SUCCEEDED" },
      select: { id: true },
    }),
    prisma.guardian.findMany({
      where: { playerProfileId: profile.id },
      orderBy: { createdAt: "asc" },
      select: {
        firstName: true,
        lastName: true,
        relationship: true,
        email: true,
        phone: true,
        kind: true,
        soleResponsibility: true,
        emailCorrectionUsed: true,
      },
    }),
    prisma.document.findMany({
      where: { registrationId, status: { not: "REPLACED" } },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        status: true,
        originalFilename: true,
        uploadedAt: true,
        expiresAt: true,
        typeId: true,
      },
    }),
    prisma.documentType.findMany({
      where: { documents: { some: { registrationId, status: { not: "REPLACED" } } } },
      select: { id: true, code: true },
    }),
    prisma.documentReview.findMany({
      where: { document: { registrationId, status: { not: "REPLACED" } } },
      orderBy: { createdAt: "desc" },
      select: { documentId: true, decision: true, reason: true },
    }),
    prisma.payment.findMany({
      where: { registrationId },
      select: { status: true },
    }),
    prisma.consentRecord.findMany({
      where: { registrationId },
      orderBy: { acceptedAt: "desc" },
      select: { legalDocumentVersionId: true, accepted: true },
    }),
    prisma.legalDocumentVersion.findMany({
      where: { consents: { some: { registrationId } } },
      select: { id: true, isCurrent: true, legalDocumentId: true },
    }),
    prisma.legalDocument.findMany({
      where: { versions: { some: { consents: { some: { registrationId } } } } },
      select: { id: true, slug: true },
    }),
    prisma.consentChoice.findMany({
      where: { registrationId },
      orderBy: { createdAt: "asc" },
      select: { code: true, accepted: true, value: true, createdAt: true },
    }),
    prisma.consentToken.findMany({
      where: { registrationId, purpose: "MARKETING", usedAt: { not: null } },
      select: { usedAt: true },
      take: 5,
    }),
    prisma.guardianAuthorization.findMany({
      where: { registrationId, authorizationType: "ENROLLMENT" },
      orderBy: { requestedAt: "desc" },
      take: 3,
      select: { id: true, status: true, guardianId: true, authorizationType: true },
    }),
    isPartnerBoxVisible(),
  ]);

  if (!team || !edition || !competition) {
    return null;
  }

  const requirements: EditionRequirement[] =
    requirementRows.length > 0
      ? requirementRows.map((requirement) => ({
          code: requirement.code,
          required: requirement.required,
          appliesTo: requirement.appliesTo,
        }))
      : DEFAULT_EDITION_REQUIREMENTS;

  const typeById = new Map(documentTypes.map((type) => [type.id, type.code]));
  const latestReviewByDocument = new Map<string, { decision: string; reason: string | null }>();
  for (const review of reviews) {
    if (!latestReviewByDocument.has(review.documentId)) {
      latestReviewByDocument.set(review.documentId, review);
    }
  }
  const medicalRow = documents.find((document) => typeById.get(document.typeId) === "MEDICAL_CERTIFICATE");
  const medicalReview = medicalRow ? latestReviewByDocument.get(medicalRow.id) : undefined;
  const versionById = new Map(legalVersions.map((version) => [version.id, version]));
  const legalById = new Map(legalDocuments.map((document) => [document.id, document.slug]));
  const consents: CurrentConsent[] = consentRecords.flatMap((record) => {
    const version = versionById.get(record.legalDocumentVersionId);
    const slug = version ? legalById.get(version.legalDocumentId) : undefined;
    if (!version || !slug) return [];
    return [
      {
        slug,
        versionId: record.legalDocumentVersionId,
        isCurrent: version.isCurrent,
        accepted: record.accepted,
      },
    ];
  });
  const choiceMap = latestChoices(
    consentChoices.map((row) => ({
      code: row.code,
      accepted: row.accepted,
      value: row.value,
      createdAt: row.createdAt.getTime(),
    })),
  );
  const isMinorPlayer = profile.birthDate ? isMinor(profile.birthDate) : false;
  const needsAgreement = profile.birthDate ? needsMediaAgreement(profile.birthDate) : false;
  const privacyAccepted =
    isPrivacyPackComplete(isMinorPlayer, consents) &&
    privacyBoxesComplete(isMinorPlayer, partnersPublished, choiceMap, registration.category);
  const mediaRecorded = mediaBoxesRecorded(isMinorPlayer, choiceMap);
  const mediaDecision: "none" | "submitted" =
    mediaRecorded || mediaDecisionFrom(consents) === "submitted" ? "submitted" : "none";
  const primaryGuardian = guardians.find((row) => row.kind !== "SECONDARY") ?? guardians[0] ?? null;
  const secondaryGuardian = guardians.find((row) => row.kind === "SECONDARY") ?? null;
  const g3 = g3Value(choiceMap);

  const enrollment = authorizations[0] ?? null;
  const contactComplete = hasMinorGuardianRequirement({
    primary: primaryGuardian,
    secondaryEmail: secondaryGuardian?.email,
    g3,
  });
  const guardianAuthorization: "authorized" | "refused" | "pending" | "none" =
    enrollment?.status === "AUTHORIZED"
      ? "authorized"
      : enrollment?.status === "REFUSED"
        ? "refused"
        : enrollment
          ? "pending"
          : "none";

  const isStaff = registration.category === "STAFF";
  const shirtSizeDue = !isStaff && !isValidShirtSize(profile.shirtSize);
  const shirtSizeOnlyGap = shirtSizeDue && hasIdentityPersonalData(profile);
  const evidence: RegistrationEvidence = {
    category: registration.category,
    hasAccount: true,
    hasPersonalData: hasCompletePersonalData(profile, { requireShirtSize: !isStaff }),
    isMinor: isMinorPlayer,
    hasGuardian: guardianAuthorization === "authorized",
    hasGuardianContact: contactComplete,
    guardianAuthorization,
    medicalStatus: isStaff ? "none" : medicalFromStatus(medicalRow?.status, medicalRow?.expiresAt),
    privacyAccepted,
    mediaDecision,
    payment: {
      mode: edition.paymentMode,
      playerSucceeded: payments.some((payment) => payment.status === "SUCCEEDED"),
      teamSucceeded: Boolean(teamPayment),
    },
  };

  const checklist = projectChecklist(requirements, evidence);
  const projected = isTerminalRegistrationStatus(registration.status)
    ? (registration.status as RegistrationStatus)
    : projectRegistrationStatus(evidence, checklist);

  return {
    user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerified) },
    profile: {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDate: profile.birthDate,
      fiscalCode: profile.fiscalCode,
      phone: profile.phone,
      shirtSize: profile.shirtSize,
    },
    shirtSizeDue,
    shirtSizeOnlyGap,
    identityConflict: workspaceIdentityBlock({
      fiscalCode: profile.fiscalCode,
      metadata: profile.metadata,
      registrationStatus: registration.status,
    }),
    guardian: primaryGuardian
      ? {
          firstName: primaryGuardian.firstName,
          lastName: primaryGuardian.lastName,
          relationship: primaryGuardian.relationship,
          email: primaryGuardian.email,
          phone: primaryGuardian.phone ?? "",
          kind: primaryGuardian.kind,
          soleResponsibility: primaryGuardian.soleResponsibility,
          emailCorrectionUsed: primaryGuardian.emailCorrectionUsed,
        }
      : null,
    secondGuardian: secondaryGuardian
      ? {
          firstName: secondaryGuardian.firstName,
          lastName: secondaryGuardian.lastName,
          email: secondaryGuardian.email,
        }
      : null,
    g3,
    guardianAuthorization,
    needsMediaAgreement: needsAgreement,
    choices: [...choiceMap.values()],
    publication: publicationFlags({
      isMinor: isMinorPlayer,
      needsAgreement,
      map: choiceMap,
    }),
    partnersPublished,
    marketingOptIn: marketingConfirmed(
      choiceMap,
      consentTokens.map((row) => ({ usedAt: row.usedAt?.getTime() ?? null })),
    ),
    registration: {
      id: registration.id,
      status: registration.status,
      teamId: registration.teamId,
      teamName: team.name,
      editionId: registration.editionId,
      editionName: edition.name,
      competitionName: competition.name,
      paymentMode: edition.paymentMode,
      currency: edition.currency,
      category: registration.category,
      playerFeeAmount: edition.playerFeeAmount,
      staffFeeAmount: edition.staffFeeAmount,
      teamFeeAmount: edition.teamFeeAmount,
      isActive: edition.isActive,
      registrationOpensAt: edition.registrationOpensAt,
      registrationClosesAt: edition.registrationClosesAt,
    },
    evidence,
    checklist,
    projectedStatus: projected,
    medicalDocument: isStaff
      ? null
      : medicalRow
      ? {
          id: medicalRow.id,
          status: medicalRow.status,
          originalFilename: medicalRow.originalFilename,
          uploadedAt: medicalRow.uploadedAt,
          rejectReason: medicalReview?.decision === "REJECTED" ? medicalReview.reason : null,
        }
      : null,
  };
}

export type PlayerWorkspace = NonNullable<Awaited<ReturnType<typeof loadPlayerWorkspace>>>;

export async function persistRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
) {
  const current = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      status: true,
      playerProfile: { select: { userId: true } },
    },
  });
  if (current && isTerminalRegistrationStatus(current.status)) return;
  await prisma.registration.update({
    where: { id: registrationId },
    data: { status },
  });
  if (current && current.status !== "APPROVED" && status === "APPROVED") {
    try {
      await notifyRegistrationApproved(current.playerProfile.userId, registrationId);
    } catch {
      logger.error("notification.dispatch_failed", { type: "REGISTRATION_APPROVED" });
    }
  }
}

export async function findProfileByFiscalCode(fiscalCode: string) {
  return prisma.playerProfile.findUnique({
    where: { fiscalCode },
    select: {
      id: true,
      userId: true,
      fiscalCode: true,
      user: { select: { lifecycleStatus: true } },
      registrations: { select: { teamId: true, editionId: true, status: true } },
    },
  });
}

export async function savePersonalProfile(
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    birthDate: Date;
    fiscalCode: string;
    phone: string;
    shirtSize?: string | null;
  },
) {
  const fiscalCode = normalizeFiscalCode(input.fiscalCode);
  const current = await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      registrations: {
        select: { id: true, teamId: true, editionId: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!current) {
    return { ok: false as const, reason: "missing_profile" as const };
  }

  const registration = current.registrations[0];
  const holderRow = await findProfileByFiscalCode(fiscalCode);
  const holder =
    holderRow && holderRow.id !== current.id
      ? holderFromProfile({
          userId: holderRow.userId,
          registrations: holderRow.registrations,
          lifecycleStatus: holderRow.user.lifecycleStatus,
        })
      : holderRow && holderRow.id === current.id
        ? holderFromProfile({
            userId: current.userId,
            registrations: current.registrations,
            lifecycleStatus: "ACTIVE",
          })
        : null;

  const classification = classifyFiscalIdentity({
    currentUserId: userId,
    currentTeamId: registration?.teamId ?? "",
    currentEditionId: registration?.editionId ?? "",
    currentRegistrationStatus: registration?.status ?? "ACCOUNT_CREATED",
    holder,
  });

  if (classification.kind === "foreign_identity") {
    if (shouldPersistIdentityBlock({ classification, currentFiscalCode: current.fiscalCode })) {
      await prisma.playerProfile.update({
        where: { id: current.id },
        data: {
          metadata: writeIdentityConflict(current.metadata, {
            code: classification.primary,
            detectedAt: new Date().toISOString(),
          }) as Prisma.InputJsonValue,
        },
      });
    }
    return {
      ok: false as const,
      reason: "identity_conflict" as const,
      publicCode: publicIdentityErrorCode(),
      classification,
    };
  }

  try {
    await prisma.playerProfile.update({
      where: { userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        birthDate: input.birthDate,
        fiscalCode,
        phone: input.phone,
        ...(input.shirtSize !== undefined ? { shirtSize: input.shirtSize } : {}),
        metadata: clearIdentityConflict(current.metadata) as Prisma.InputJsonValue,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { name: `${input.firstName} ${input.lastName}`.trim() },
    });
    return { ok: true as const, classification };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await findProfileByFiscalCode(fiscalCode);
      const foreign = classifyOccupiedFiscalCode({
        currentUserId: userId,
        currentTeamId: registration?.teamId ?? "",
        currentEditionId: registration?.editionId ?? "",
        currentRegistrationStatus: registration?.status ?? "ACCOUNT_CREATED",
        holder: holderFromProfile(
          raced
            ? {
                userId: raced.userId,
                registrations: raced.registrations,
                lifecycleStatus: raced.user.lifecycleStatus,
              }
            : null,
        ),
      });
      if (shouldPersistIdentityBlock({ classification: foreign, currentFiscalCode: current.fiscalCode })) {
        await prisma.playerProfile.update({
          where: { id: current.id },
          data: {
            metadata: writeIdentityConflict(current.metadata, {
              code: foreign.primary,
              detectedAt: new Date().toISOString(),
            }) as Prisma.InputJsonValue,
          },
        });
      }
      return {
        ok: false as const,
        reason: "identity_conflict" as const,
        publicCode: publicIdentityErrorCode(),
        classification: foreign,
      };
    }
    throw error;
  }
}

export async function saveGuardianProfile(
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    g3: "OTHER_PARENT" | "SOLE";
    secondFirstName?: string;
    secondLastName?: string;
    secondEmail?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      guardians: { orderBy: { createdAt: "asc" } },
      registrations: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
    },
  });
  if (!profile) return { ok: false as const, reason: "missing_profile" as const };
  const registrationId = profile.registrations[0]?.id;
  if (!registrationId) return { ok: false as const, reason: "missing_profile" as const };

  if (input.g3 === "OTHER_PARENT") {
    const second = input.secondEmail?.trim().toLowerCase();
    if (!second) return { ok: false as const, reason: "second_email" as const };
    if (second === input.email.trim().toLowerCase()) {
      return { ok: false as const, reason: "same_email" as const };
    }
  }

  const primary = profile.guardians.find((row) => row.kind !== "SECONDARY") ?? profile.guardians[0];
  const secondary = profile.guardians.find((row) => row.kind === "SECONDARY");

  const primaryData = {
    firstName: input.firstName,
    lastName: input.lastName,
    relationship: input.relationship,
    email: input.email,
    phone: input.phone,
    kind: "PRIMARY",
    soleResponsibility: input.g3 === "SOLE",
  };

  let primaryId: string;
  if (primary) {
    await prisma.guardian.update({ where: { id: primary.id }, data: primaryData });
    primaryId = primary.id;
  } else {
    const created = await prisma.guardian.create({
      data: { playerProfileId: profile.id, ...primaryData },
    });
    primaryId = created.id;
  }

  if (input.g3 === "OTHER_PARENT" && input.secondEmail) {
    const secondData = {
      firstName: input.secondFirstName?.trim() || "",
      lastName: input.secondLastName?.trim() || "",
      relationship: "GENITORE",
      email: input.secondEmail.trim().toLowerCase(),
      kind: "SECONDARY",
      soleResponsibility: false,
    };
    if (secondary) {
      const emailChanged = secondary.email !== secondData.email;
      if (emailChanged && secondary.emailCorrectionUsed) {
        return { ok: false as const, reason: "email_correction_used" as const };
      }
      await prisma.guardian.update({
        where: { id: secondary.id },
        data: {
          ...secondData,
          emailCorrectionUsed: emailChanged ? true : secondary.emailCorrectionUsed,
        },
      });
    } else {
      await prisma.guardian.create({
        data: { playerProfileId: profile.id, phone: null, ...secondData },
      });
    }
  }

  await prisma.consentChoice.create({
    data: {
      userId,
      registrationId,
      code: "G3",
      accepted: true,
      value: input.g3,
      source: "CONTACT",
      actorKind: "USER",
      actorRole: "PLAYER",
      guardianId: primaryId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  if (input.g3 === "SOLE") {
    await prisma.consentToken.updateMany({
      where: { registrationId, purpose: "C1", usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.guardianLinkToken.updateMany({
      where: { registrationId, purpose: "PUBLICATION", usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  return { ok: true as const, primaryId, playerProfileId: profile.id, registrationId };
}
