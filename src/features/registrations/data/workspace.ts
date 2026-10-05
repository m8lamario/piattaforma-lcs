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
import { hasCompletePersonalData, hasMinorGuardianRequirement } from "@/features/players/domain/personal";
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

function medicalFromStatus(status: string | undefined): MedicalEvidence {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      playerProfile: {
        include: {
          guardians: { orderBy: { createdAt: "asc" } },
          registrations: {
            include: {
              team: {
                include: {
                  edition: { include: { competition: true, requirements: true } },
                  payments: {
                    where: { status: "SUCCEEDED", registrationId: null },
                    select: { id: true },
                  },
                },
              },
              documents: {
                where: { status: { not: "REPLACED" } },
                include: {
                  type: true,
                  reviews: { orderBy: { createdAt: "desc" }, take: 1 },
                },
                orderBy: { uploadedAt: "desc" },
              },
              payments: true,
              consentRecords: {
                include: { legalDocumentVersion: { include: { legalDocument: true } } },
                orderBy: { acceptedAt: "desc" },
              },
              consentChoices: { orderBy: { createdAt: "asc" } },
              consentTokens: {
                where: { purpose: "MARKETING", usedAt: { not: null } },
                select: { usedAt: true },
                take: 5,
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const profile = user?.playerProfile ?? null;
  const registration = profile?.registrations[0] ?? null;
  if (!user || !profile || !registration) {
    return null;
  }

  const requirements: EditionRequirement[] =
    registration.team.edition.requirements.length > 0
      ? registration.team.edition.requirements.map((requirement) => ({
          code: requirement.code,
          required: requirement.required,
          appliesTo: requirement.appliesTo,
        }))
      : DEFAULT_EDITION_REQUIREMENTS;

  const medicalDoc = registration.documents.find((document) => document.type.code === "MEDICAL_CERTIFICATE");
  const consents: CurrentConsent[] = registration.consentRecords.map((record) => ({
    slug: record.legalDocumentVersion.legalDocument.slug,
    versionId: record.legalDocumentVersionId,
    isCurrent: record.legalDocumentVersion.isCurrent,
    accepted: record.accepted,
  }));
  const choiceMap = latestChoices(
    registration.consentChoices.map((row) => ({
      code: row.code,
      accepted: row.accepted,
      value: row.value,
      createdAt: row.createdAt.getTime(),
    })),
  );
  const isMinorPlayer = profile.birthDate ? isMinor(profile.birthDate) : false;
  const needsAgreement = profile.birthDate ? needsMediaAgreement(profile.birthDate) : false;
  const partnersPublished = await isPartnerBoxVisible();
  const privacyAccepted =
    isPrivacyPackComplete(isMinorPlayer, consents) &&
    privacyBoxesComplete(isMinorPlayer, partnersPublished, choiceMap);
  const mediaRecorded = mediaBoxesRecorded(isMinorPlayer, choiceMap);
  const mediaDecision: "none" | "submitted" =
    mediaRecorded || mediaDecisionFrom(consents) === "submitted" ? "submitted" : "none";
  const primaryGuardian = profile.guardians.find((row) => row.kind !== "SECONDARY") ?? profile.guardians[0] ?? null;
  const secondaryGuardian = profile.guardians.find((row) => row.kind === "SECONDARY") ?? null;
  const g3 = g3Value(choiceMap);

  const evidence: RegistrationEvidence = {
    hasAccount: true,
    hasPersonalData: hasCompletePersonalData(profile),
    isMinor: isMinorPlayer,
    hasGuardian: hasMinorGuardianRequirement({
      primary: primaryGuardian,
      secondaryEmail: secondaryGuardian?.email,
      g3,
    }),
    medicalStatus: medicalFromStatus(medicalDoc?.status),
    privacyAccepted,
    mediaDecision,
    payment: {
      mode: registration.team.edition.paymentMode,
      playerSucceeded: registration.payments.some((payment) => payment.status === "SUCCEEDED"),
      teamSucceeded: registration.team.payments.length > 0,
    },
  };

  const checklist = projectChecklist(requirements, evidence);
  const projected = isTerminalRegistrationStatus(registration.status)
    ? (registration.status as RegistrationStatus)
    : projectRegistrationStatus(evidence, checklist);

  return {
    user: { id: user.id, email: user.email },
    profile: {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDate: profile.birthDate,
      fiscalCode: profile.fiscalCode,
      phone: profile.phone,
    },
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
      registration.consentTokens.map((row) => ({ usedAt: row.usedAt?.getTime() ?? null })),
    ),
    registration: {
      id: registration.id,
      status: registration.status,
      teamId: registration.teamId,
      teamName: registration.team.name,
      editionId: registration.editionId,
      editionName: registration.team.edition.name,
      competitionName: registration.team.edition.competition.name,
      paymentMode: registration.team.edition.paymentMode,
      currency: registration.team.edition.currency,
      playerFeeAmount: registration.team.edition.playerFeeAmount,
      teamFeeAmount: registration.team.edition.teamFeeAmount,
      isActive: registration.team.edition.isActive,
      registrationOpensAt: registration.team.edition.registrationOpensAt,
      registrationClosesAt: registration.team.edition.registrationClosesAt,
    },
    evidence,
    checklist,
    projectedStatus: projected,
    medicalDocument: medicalDoc
      ? {
          id: medicalDoc.id,
          status: medicalDoc.status,
          originalFilename: medicalDoc.originalFilename,
          uploadedAt: medicalDoc.uploadedAt,
          rejectReason: medicalDoc.reviews[0]?.decision === "REJECTED" ? medicalDoc.reviews[0].reason : null,
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
      code: "G1",
      accepted: true,
      source: "WEB",
      guardianId: primaryId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  await prisma.consentChoice.create({
    data: {
      userId,
      registrationId,
      code: "G3",
      accepted: true,
      value: input.g3,
      source: "WEB",
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
  }

  return { ok: true as const, primaryId };
}
