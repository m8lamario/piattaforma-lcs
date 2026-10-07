import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import { prisma } from "@/shared/lib/prisma";
import { it } from "@/shared/i18n/it";

export async function notifyStaffOfSchoolAccessRequest(input: {
  requestId: string;
  schoolName: string;
  city: string;
  origin: string;
}) {
  const staff = await prisma.userRole.findMany({
    where: { role: { in: ["ORGANIZATION_ADMIN", "SUPER_ADMIN"] } },
    select: { userId: true, user: { select: { email: true } } },
  });
  const seen = new Set<string>();
  const reviewUrl = `${input.origin}/admin/richieste/${input.requestId}`;

  for (const row of staff) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    const notification = await prisma.notification.create({
      data: {
        userId: row.userId,
        type: "SCHOOL_ACCESS_INTERNAL",
        title: it.notifySchoolAccessTitle,
        body: `${input.schoolName} · ${input.city}`,
        metadata: { requestId: input.requestId },
      },
    });
    if (!row.user.email) continue;
    await dispatchOutboundEmail({
      idempotencyKey: `school-access:${input.requestId}:notify:${row.userId}`,
      purpose: "SCHOOL_ACCESS_INTERNAL",
      templateKey: "SCHOOL_ACCESS_INTERNAL",
      to: row.user.email,
      userId: row.userId,
      recipientKind: "USER",
      variables: {
        title: it.emailSchoolAccessInternalSubject,
        schoolName: input.schoolName,
        summary: `${input.schoolName} · ${input.city}`,
        link: reviewUrl,
      },
      sourceEntityType: "SchoolRegistrationRequest",
      sourceEntityId: input.requestId,
      notificationId: notification.id,
    });
  }
}
