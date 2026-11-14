import { MEDICAL_DEADLINE_REMINDER_DAYS } from "@/shared/config/app";
import { createNotification, hasNotification } from "@/features/notifications/data/notifications";
import {
  medicalDeadlineFingerprint,
  medicalDeadlineReminderDaysDue,
  medicalUploadDeadline,
  projectSportEligibility,
  shouldRemindMedicalDeadline,
} from "@/features/registrations/domain/eligibility";
import { it } from "@/shared/i18n/it";
import { prisma } from "@/shared/lib/prisma";
import { isMedicalExpired } from "@/features/documents/domain/retention";

function medicalStatusOf(document: { status: string; expiresAt: Date | null } | undefined) {
  if (!document) return "none" as const;
  if (document.status === "APPROVED" && isMedicalExpired(document.expiresAt)) return "expired" as const;
  if (document.status === "APPROVED") return "approved" as const;
  if (document.status === "REJECTED" || document.status === "CHANGES_REQUESTED") return "rejected" as const;
  if (document.status === "EXPIRED") return "expired" as const;
  if (document.status === "PENDING_REVIEW" || document.status === "UPLOADED") return "pending" as const;
  return "none" as const;
}

export async function runMedicalDeadlineReminders(now = new Date()) {
  const editions = await prisma.edition.findMany({
    where: { startsAt: { not: null } },
    select: {
      startsAt: true,
      teams: {
        select: {
          id: true,
          representativeUserId: true,
          registrations: {
            where: { category: "PLAYER", status: { notIn: ["WITHDRAWN", "REMOVED"] } },
            select: {
              id: true,
              playerProfile: { select: { userId: true } },
              documents: {
                where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
                orderBy: { uploadedAt: "desc" },
                take: 1,
                select: { status: true, expiresAt: true, blobPurgedAt: true },
              },
            },
          },
        },
      },
    },
  });

  let players = 0;
  let representatives = 0;

  for (const edition of editions) {
    const uploadDeadline = medicalUploadDeadline(edition.startsAt);
    if (!uploadDeadline) continue;
    const daysDue = medicalDeadlineReminderDaysDue({
      uploadDeadline,
      now,
      reminderDays: MEDICAL_DEADLINE_REMINDER_DAYS,
    });
    if (daysDue.length === 0) continue;

    for (const team of edition.teams) {
      const duePlayers: { userId: string; registrationId: string }[] = [];
      for (const registration of team.registrations) {
        const document = registration.documents[0];
        const medicalStatus = medicalStatusOf(document);
        const eligibility = projectSportEligibility({
          category: "PLAYER",
          medicalStatus,
          medicalExpiresAt: document?.expiresAt ?? null,
          hasFile: Boolean(document && !document.blobPurgedAt),
          startsAt: edition.startsAt,
          now,
        });
        if (!shouldRemindMedicalDeadline({ medicalStatus, eligible: eligibility.eligible })) continue;
        duePlayers.push({
          userId: registration.playerProfile.userId,
          registrationId: registration.id,
        });
      }

      for (const player of duePlayers) {
        for (const day of daysDue) {
          const value = medicalDeadlineFingerprint("player", player.registrationId, day);
          if (
            await hasNotification({
              userId: player.userId,
              type: "MEDICAL_DEADLINE",
              key: "fingerprint",
              value,
            })
          ) {
            continue;
          }
          await createNotification({
            userId: player.userId,
            type: "MEDICAL_DEADLINE",
            title: it.notifyMedicalDeadlineTitle,
            body: it.notifyMedicalDeadlineBody,
            metadata: {
              registrationId: player.registrationId,
              reminderDay: String(day),
              fingerprint: value,
            },
          });
          players += 1;
        }
      }

      if (duePlayers.length === 0 || !team.representativeUserId) continue;
      for (const day of daysDue) {
        const value = medicalDeadlineFingerprint("team", team.id, day);
        if (
          await hasNotification({
            userId: team.representativeUserId,
            type: "MEDICAL_DEADLINE",
            key: "fingerprint",
            value,
          })
        ) {
          continue;
        }
        await createNotification({
          userId: team.representativeUserId,
          type: "MEDICAL_DEADLINE",
          title: it.notifyMedicalDeadlineRepTitle,
          body: it.notifyMedicalDeadlineRepBody,
          metadata: {
            teamId: team.id,
            reminderDay: String(day),
            fingerprint: value,
          },
        });
        representatives += 1;
      }
    }
  }

  return { players, representatives };
}
