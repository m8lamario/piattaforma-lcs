export const adminDocumentSelect = {
  id: true,
  status: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  playerProfile: { select: { firstName: true, lastName: true, userId: true } },
  registration: { select: { teamId: true, team: { select: { id: true, name: true } } } },
  reviews: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { decision: true, reason: true, createdAt: true },
  },
};
