import { Prisma } from "@generated/client";
import { isMinor } from "@/features/players/domain/age";
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
import { hasCompleteGuardian, hasCompletePersonalData } from "@/features/players/domain/personal";
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
import { prisma } from "@/shared/lib/prisma";

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
          guardians: { orderBy: { createdAt: "asc" }, take: 1 },
          registrations: {
            include: {
              team: {
                include: {
                  edition: { include: { competition: true, requirements: true } },
                  payments: { where: { status: "SUCCEEDED" }, select: { id: true } },
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
  const isMinorPlayer = profile.birthDate ? isMinor(profile.birthDate) : false;
  const privacyAccepted = isPrivacyPackComplete(isMinorPlayer, consents);
  const mediaDecision = mediaDecisionFrom(consents);

  const evidence: RegistrationEvidence = {
    hasAccount: true,
    hasPersonalData: hasCompletePersonalData(profile),
    isMinor: isMinorPlayer,
    hasGuardian: hasCompleteGuardian(profile.guardians[0] ?? null),
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
    guardian: profile.guardians[0]
      ? {
          firstName: profile.guardians[0].firstName,
          lastName: profile.guardians[0].lastName,
          relationship: profile.guardians[0].relationship,
          email: profile.guardians[0].email,
          phone: profile.guardians[0].phone,
        }
      : null,
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
    select: { status: true },
  });
  if (current && isTerminalRegistrationStatus(current.status)) return;
  await prisma.registration.update({
    where: { id: registrationId },
    data: { status },
  });
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
  },
) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { guardians: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!profile) return { ok: false as const, reason: "missing_profile" as const };

  const existing = profile.guardians[0];
  if (existing) {
    await prisma.guardian.update({
      where: { id: existing.id },
      data: input,
    });
  } else {
    await prisma.guardian.create({
      data: {
        playerProfileId: profile.id,
        ...input,
      },
    });
  }
  return { ok: true as const };
}
