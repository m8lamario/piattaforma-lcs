export const leagueRegistrationSelect = {
  id: true,
  status: true,
  reviewedAt: true,
  category: true,
  editionId: true,
  team: {
    select: {
      id: true,
      name: true,
      schoolId: true,
      school: { select: { id: true, name: true, city: true } },
      edition: { select: { id: true, name: true, paymentMode: true, competition: { select: { name: true } } } },
      payments: {
        where: { registrationId: null, status: "SUCCEEDED" },
        select: { id: true },
        take: 1,
      },
    },
  },
  playerProfile: {
    select: { firstName: true, lastName: true },
  },
  documents: {
    where: { status: { not: "REPLACED" }, type: { code: "MEDICAL_CERTIFICATE" } },
    select: { status: true, expiresAt: true },
    take: 1,
    orderBy: { uploadedAt: "desc" as const },
  },
  payments: { select: { status: true } },
} as const;
