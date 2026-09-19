import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";
import { readLegalDocument } from "@/shared/lib/legal";
import { LEGAL_CATALOG } from "@/features/consents/domain/catalog";

export const ensureLegalDocuments = cache(async () => {
  await Promise.all(
    LEGAL_CATALOG.map(async (item) => {
      const body = await readLegalDocument(item.slug);
      const document = await prisma.legalDocument.upsert({
        where: { slug: item.slug },
        update: { title: item.title, audience: item.audience, requiredByDefault: item.requiredByDefault },
        create: {
          slug: item.slug,
          title: item.title,
          audience: item.audience,
          requiredByDefault: item.requiredByDefault,
        },
      });

      const current = await prisma.legalDocumentVersion.findFirst({
        where: { legalDocumentId: document.id, isCurrent: true },
      });
      if (current) {
        if (current.body !== body) {
          await prisma.legalDocumentVersion.updateMany({
            where: { legalDocumentId: document.id },
            data: { isCurrent: false },
          });
          await prisma.legalDocumentVersion.create({
            data: {
              legalDocumentId: document.id,
              version: `placeholder-${Date.now()}`,
              body,
              effectiveAt: new Date(),
              isCurrent: true,
            },
          });
        }
        return;
      }

      await prisma.legalDocumentVersion.create({
        data: {
          legalDocumentId: document.id,
          version: "placeholder-1",
          body,
          effectiveAt: new Date(),
          isCurrent: true,
        },
      });
    }),
  );
});

export async function getCurrentLegalVersions(slugs: string[]) {
  await ensureLegalDocuments();
  return prisma.legalDocumentVersion.findMany({
    where: {
      isCurrent: true,
      legalDocument: { slug: { in: slugs } },
    },
    include: { legalDocument: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCurrentLegalBySlug(slug: string) {
  const [version] = await getCurrentLegalVersions([slug]);
  return version ?? null;
}

export async function recordConsent(input: {
  userId: string;
  registrationId: string;
  versionId: string;
  consentType: "REQUIRED" | "OPTIONAL";
  accepted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const version = await prisma.legalDocumentVersion.findUnique({
    where: { id: input.versionId },
    include: { legalDocument: true },
  });
  if (!version || !version.isCurrent) {
    return { ok: false as const, reason: "stale_version" as const };
  }

  const created = await prisma.consentRecord.create({
    data: {
      userId: input.userId,
      legalDocumentVersionId: version.id,
      registrationId: input.registrationId,
      consentType: input.consentType,
      accepted: input.accepted,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  return { ok: true as const, record: created, slug: version.legalDocument.slug };
}
