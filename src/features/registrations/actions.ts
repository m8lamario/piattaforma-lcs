"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/shared/lib/prisma";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId, isStaff } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";
import { Prisma } from "@generated/client";
import { clearIdentityConflict } from "@/features/players/domain/identity";
import { createNotification } from "@/features/notifications/data/notifications";
import { fail, type ActionFailure } from "@/shared/errors";

export async function withdrawRegistrationAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const registrationId = String(formData.get("registrationId") ?? "");
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { playerProfile: true, team: true },
  });
  if (!registration) return fail("REGISTRATION_NOT_FOUND");

  const owner = authorize(actor, "registration:withdraw", {
    ownerUserId: registration.playerProfile.userId,
    teamId: registration.teamId,
  });
  const staff = isStaff(actor) && authorize(actor, "admin:manage").allow;
  if (!owner.allow && !staff) return fail("FORBIDDEN_RESOURCE");
  if (registration.status === "WITHDRAWN") return fail("REGISTRATION_WITHDRAWN");
  if (registration.status === "REMOVED") return fail("LIFECYCLE_REGISTRATION_REMOVED");

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: { status: "WITHDRAWN" },
    }),
    prisma.playerProfile.update({
      where: { id: registration.playerProfileId },
      data: {
        metadata: clearIdentityConflict(registration.playerProfile.metadata) as Prisma.InputJsonValue,
      },
    }),
  ]);
  await createNotification({
    userId: registration.playerProfile.userId,
    type: "REGISTRATION_WITHDRAWN",
    title: "Iscrizione ritirata",
    body: "L’iscrizione risulta ritirata. I dati restano conservati.",
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "REGISTRATION_WITHDRAW",
    entityType: "Registration",
    entityId: registration.id,
  });
  revalidatePath("/area");
  revalidatePath("/squadra");
  revalidatePath("/admin/registrazioni");
  revalidatePath(`/admin/giocatori/${registration.playerProfileId}`);
}
