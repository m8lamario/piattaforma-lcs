import { isMinor } from "@/features/players/domain/age";
import { prisma } from "@/shared/lib/prisma";

export async function minorGuardianEmail(userId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: {
      birthDate: true,
      guardians: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
    },
  });
  if (!profile?.birthDate || !isMinor(profile.birthDate)) return null;
  return profile.guardians[0]?.email?.trim().toLowerCase() || null;
}
