import { prisma } from "@/shared/lib/prisma";
import { toRosterRow } from "@/features/teams/domain/roster";

export async function listTeamRoster(teamId: string) {
  const registrations = await prisma.registration.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    include: {
      playerProfile: { select: { firstName: true, lastName: true } },
      documents: {
        where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
        select: { status: true },
        take: 1,
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  return registrations.map((registration) =>
    toRosterRow({
      registrationId: registration.id,
      firstName: registration.playerProfile.firstName,
      lastName: registration.playerProfile.lastName,
      registrationStatus: registration.status,
      medicalStatus: registration.documents[0]?.status,
    }),
  );
}
