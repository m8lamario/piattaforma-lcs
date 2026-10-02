import {
  isConsentReceiptReady,
  type CurrentConsent,
} from "@/features/consents/domain/pack";
import {
  consentReceiptFingerprint,
  consentReceiptRows,
  type ConsentSnapshot,
} from "@/features/consents/domain/receipt";
import { latestChoices, choiceSummaryLines, type ConsentBoxCode } from "@/features/consents/domain/boxes";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { createNotification, hasConsentReceipt } from "@/features/notifications/data/notifications";
import { appOrigin } from "@/shared/config/app";
import { it } from "@/shared/i18n/it";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

function formatDocuments(
  rows: ReturnType<typeof consentReceiptRows>,
) {
  return rows
    .map((row) => {
      const choice = row.accepted ? it.consentReceiptAccepted : it.consentReceiptRefused;
      return `${row.title} (${it.consentVersion} ${row.version}): ${choice}\n${row.url}`;
    })
    .join("\n\n");
}

export async function dispatchConsentReceiptIfComplete(input: {
  userId: string;
  registrationId: string;
  isMinor: boolean;
  mediaApplies: boolean;
  mediaRequired: boolean;
}) {
  const records = await prisma.consentRecord.findMany({
    where: { registrationId: input.registrationId },
    include: { legalDocumentVersion: { include: { legalDocument: true } } },
    orderBy: { acceptedAt: "desc" },
  });

  const consents: CurrentConsent[] = records.map((record) => ({
    slug: record.legalDocumentVersion.legalDocument.slug,
    versionId: record.legalDocumentVersionId,
    isCurrent: record.legalDocumentVersion.isCurrent,
    accepted: record.accepted,
  }));
  if (
    !isConsentReceiptReady(input.isMinor, { applies: input.mediaApplies, required: input.mediaRequired }, consents)
  ) {
    return;
  }

  const snapshots: ConsentSnapshot[] = records.map((record) => ({
    slug: record.legalDocumentVersion.legalDocument.slug,
    version: record.legalDocumentVersion.version,
    title: record.legalDocumentVersion.legalDocument.title,
    accepted: record.accepted,
    acceptedAt: record.acceptedAt.getTime(),
  }));
  const fingerprint = consentReceiptFingerprint(snapshots);
  if (await hasConsentReceipt(input.userId, fingerprint, input.registrationId)) {
    return;
  }

  const documents = formatDocuments(consentReceiptRows(snapshots, appOrigin()));
  const choices = await prisma.consentChoice.findMany({
    where: { registrationId: input.registrationId },
    orderBy: { createdAt: "asc" },
  });
  const map = latestChoices(
    choices.map((row) => ({
      code: row.code,
      accepted: row.accepted,
      value: row.value,
      createdAt: row.createdAt.getTime(),
    })),
  );
  const partnersPublished = await isPartnerBoxVisible();
  const boxLines = choiceSummaryLines(input.isMinor, partnersPublished, map, (code: ConsentBoxCode) => it[`box${code}`]);
  const body = [documents, boxLines.join("\n")].filter(Boolean).join("\n\n");
  try {
    await createNotification({
      userId: input.userId,
      type: "REGISTRATION_RECEIVED",
      title: it.notificationRegistrationReceivedTitle,
      body: it.notificationRegistrationReceivedBody,
      metadata: { fingerprint, registrationId: input.registrationId },
      emailVariables: { documents: body },
    });
  } catch {
    logger.error("notification.dispatch_failed", { type: "REGISTRATION_RECEIVED" });
  }
}
