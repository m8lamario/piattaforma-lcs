import { prisma } from "@/shared/lib/prisma";
import {
  latestChoices,
  type ChoiceSnapshot,
  type ConsentBoxCode,
  type G3Value,
} from "@/features/consents/domain/boxes";

export type ChoiceWrite = {
  userId: string;
  registrationId: string;
  code: ConsentBoxCode | "C1";
  accepted: boolean;
  value?: string | null;
  source?: string;
  legalDocumentVersionId?: string | null;
  guardianId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function appendConsentChoice(input: ChoiceWrite) {
  return prisma.consentChoice.create({
    data: {
      userId: input.userId,
      registrationId: input.registrationId,
      code: input.code,
      accepted: input.accepted,
      value: input.value ?? null,
      source: input.source ?? "WEB",
      legalDocumentVersionId: input.legalDocumentVersionId ?? null,
      guardianId: input.guardianId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function listConsentChoices(registrationId: string): Promise<ChoiceSnapshot[]> {
  const rows = await prisma.consentChoice.findMany({
    where: { registrationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    code: row.code,
    accepted: row.accepted,
    value: row.value,
    createdAt: row.createdAt.getTime(),
  }));
}

export async function latestChoiceMap(registrationId: string) {
  return latestChoices(await listConsentChoices(registrationId));
}

export async function appendBoxSet(
  input: Omit<ChoiceWrite, "code" | "accepted" | "value"> & {
    boxes: Array<{ code: ConsentBoxCode; accepted: boolean; value?: string | null }>;
  },
) {
  if (input.boxes.length === 0) return [];
  return prisma.$transaction(
    input.boxes.map((box) =>
      prisma.consentChoice.create({
        data: {
          userId: input.userId,
          registrationId: input.registrationId,
          code: box.code,
          accepted: box.accepted,
          value: box.value ?? null,
          source: input.source ?? "WEB",
          legalDocumentVersionId: input.legalDocumentVersionId ?? null,
          guardianId: input.guardianId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      }),
    ),
  );
}

export function asG3Value(value: string | null | undefined): G3Value | null {
  if (value === "OTHER_PARENT" || value === "SOLE") return value;
  return null;
}
