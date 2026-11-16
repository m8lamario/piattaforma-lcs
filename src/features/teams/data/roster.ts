import { prisma } from "@/shared/lib/prisma";
import { isMinor, needsMediaAgreement } from "@/features/players/domain/age";
import { g3Value, latestChoices, mediaBoxesRecorded, privacyBoxesComplete, publicationFlags } from "@/features/consents/domain/boxes";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { isMediaComplete, isPrivacyPackComplete, type CurrentConsent } from "@/features/consents/domain/pack";
import { hasCompletePersonalData, hasMinorGuardianRequirement } from "@/features/players/domain/personal";
import { isMedicalExpired } from "@/features/documents/domain/retention";
import { projectSportEligibility } from "@/features/registrations/domain/eligibility";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { staffOccupiesSlot } from "@/features/teams/domain/staff";
import { toRosterRow, toTeammateRow, type RosterGuardianState } from "@/features/teams/domain/roster";

export async function listTeamRoster(teamId: string) {
  const [team, registrations, memberships, partnersPublished] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        coachRegistrationId: true,
        edition: { select: { paymentMode: true, startsAt: true } },
        payments: {
          where: { registrationId: null, status: "SUCCEEDED" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.registration.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: {
        playerProfile: {
          select: {
            firstName: true,
            lastName: true,
            userId: true,
            birthDate: true,
            shirtSize: true,
            fiscalCode: true,
            phone: true,
            user: { select: { emailVerified: true } },
            guardians: {
              select: { firstName: true, lastName: true, relationship: true, email: true, phone: true, kind: true },
            },
          },
        },
        documents: {
          where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
          select: { status: true, expiresAt: true, blobPurgedAt: true },
          take: 1,
          orderBy: { uploadedAt: "desc" },
        },
        payments: { select: { status: true } },
        consentChoices: { select: { code: true, accepted: true, value: true, createdAt: true } },
        consentRecords: {
          select: {
            accepted: true,
            legalDocumentVersion: {
              select: { isCurrent: true, legalDocument: { select: { slug: true } } },
            },
          },
        },
        authorizations: {
          where: { authorizationType: "ENROLLMENT" },
          orderBy: { requestedAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
    prisma.teamMembership.findMany({ where: { teamId } }),
    isPartnerBoxVisible(),
  ]);

  const membershipByUser = new Map(memberships.map((row) => [row.userId, row]));

  return registrations
    .map((registration) => {
      const membership = membershipByUser.get(registration.playerProfile.userId);
      const birthDate = registration.playerProfile.birthDate;
      const isMinorPlayer = birthDate ? isMinor(birthDate) : false;
      const map = latestChoices(
        registration.consentChoices.map((row) => ({
          code: row.code,
          accepted: row.accepted,
          value: row.value,
          createdAt: row.createdAt.getTime(),
        })),
      );
      const isStaff = registration.category === "STAFF";
      const consents: CurrentConsent[] = registration.consentRecords.map((record) => ({
        slug: record.legalDocumentVersion.legalDocument.slug,
        versionId: record.legalDocumentVersion.legalDocument.slug,
        isCurrent: record.legalDocumentVersion.isCurrent,
        accepted: record.accepted,
      }));
      const enrollment = registration.authorizations[0] ?? null;
      const primaryGuardian =
        registration.playerProfile.guardians.find((row) => row.kind !== "SECONDARY") ??
        registration.playerProfile.guardians[0] ??
        null;
      const secondaryGuardian = registration.playerProfile.guardians.find((row) => row.kind === "SECONDARY") ?? null;
      const contactComplete = hasMinorGuardianRequirement({
        primary: primaryGuardian,
        secondaryEmail: secondaryGuardian?.email,
        g3: g3Value(map),
      });
      const guardianState: RosterGuardianState = !isMinorPlayer
        ? "na"
        : enrollment?.status === "AUTHORIZED"
          ? "authorized"
          : enrollment?.status === "REFUSED"
            ? "refused"
            : enrollment || contactComplete
              ? "pending"
              : "none";
      const medicalRow = registration.documents[0];
      const medicalExpired = medicalRow?.status === "APPROVED" && isMedicalExpired(medicalRow.expiresAt);
      const medicalStatus = isStaff ? null : medicalExpired ? "EXPIRED" : medicalRow?.status;
      const mappedMedical =
        medicalStatus === "APPROVED"
          ? "approved"
          : medicalStatus === "REJECTED"
            ? "rejected"
            : medicalStatus === "EXPIRED"
              ? "expired"
              : medicalStatus === "PENDING_REVIEW" ||
                  medicalStatus === "UPLOADED" ||
                  medicalStatus === "PROCESSING" ||
                  medicalStatus === "PREVALIDATED"
                ? "pending"
                : "none";
      const eligibility = projectSportEligibility({
        category: registration.category,
        medicalStatus: mappedMedical,
        medicalExpiresAt: medicalRow?.expiresAt ?? null,
        hasFile: Boolean(medicalRow && !medicalRow.blobPurgedAt),
        startsAt: team?.edition.startsAt ?? null,
      });
      return toRosterRow({
        registrationId: registration.id,
        userId: registration.playerProfile.userId,
        membershipId: membership?.id,
        membershipRole: membership?.role,
        category: registration.category,
        firstName: registration.playerProfile.firstName,
        lastName: registration.playerProfile.lastName,
        jerseyNumber: membership?.jerseyNumber,
        rosterRole: membership?.rosterRole,
        shirtSize: isStaff ? null : registration.playerProfile.shirtSize,
        registrationStatus: registration.status,
        medicalStatus,
        paymentCovered: isPaymentCovered({
          mode: team?.edition.paymentMode ?? "PLAYER",
          playerSucceeded: registration.payments.some((payment) => payment.status === "SUCCEEDED"),
          teamSucceeded: Boolean(team?.payments.length),
        }),
        consentDue:
          isStaff &&
          (registration.status === "INVITED" ||
            registration.status === "ACCOUNT_CREATED" ||
            registration.status === "IN_PROGRESS"),
        isCoach:
          isStaff &&
          registration.id === team?.coachRegistrationId &&
          staffOccupiesSlot(registration.status),
        publication: publicationFlags({
          isMinor: isMinorPlayer,
          needsAgreement: birthDate ? needsMediaAgreement(birthDate) : false,
          map,
        }),
        emailVerified: Boolean(registration.playerProfile.user.emailVerified),
        guardianState,
        personalDataComplete: hasCompletePersonalData(registration.playerProfile, { requireShirtSize: !isStaff }),
        privacyComplete:
          isPrivacyPackComplete(isMinorPlayer, consents) &&
          privacyBoxesComplete(isMinorPlayer, partnersPublished, map, registration.category),
        mediaComplete: isMediaComplete(true, mediaBoxesRecorded(isMinorPlayer, map) ? "submitted" : "none"),
        sportEligible: eligibility.eligible,
      });
    })
    .filter((row) => Boolean(row.membershipId) && row.registrationStatus !== "REMOVED");
}

export async function listTeammates(teamId: string) {
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId, role: "PLAYER" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, playerProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  return memberships
    .filter((row) => row.user.playerProfile)
    .map((row) =>
      toTeammateRow({
        userId: row.userId,
        firstName: row.user.playerProfile!.firstName,
        lastName: row.user.playerProfile!.lastName,
        jerseyNumber: row.jerseyNumber,
        rosterRole: row.rosterRole,
      }),
    );
}

export async function updateMembershipRoster(input: {
  membershipId: string;
  teamId: string;
  jerseyNumber: string | null;
  rosterRole: string | null;
}) {
  const membership = await prisma.teamMembership.findFirst({
    where: { id: input.membershipId, teamId: input.teamId },
    select: { role: true },
  });
  if (!membership) return false;
  const staff = membership.role === "STAFF";
  const result = await prisma.teamMembership.updateMany({
    where: { id: input.membershipId, teamId: input.teamId },
    data: {
      jerseyNumber: staff ? null : input.jerseyNumber,
      rosterRole: staff ? null : input.rosterRole,
    },
  });
  return result.count === 1;
}

export async function listTeamsByIds(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      edition: { select: { name: true, competition: { select: { name: true } } } },
    },
  });
}
