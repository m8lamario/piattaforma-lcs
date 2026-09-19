import { auth } from "@/auth";
import { applyProviderResult, getPaymentById } from "@/features/payments/data/payments";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
} from "@/features/registrations/data/workspace";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { createNotification } from "@/features/notifications/data/notifications";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import { userAgentAndIp } from "@/shared/lib/request-guard";

async function persistByUser(userId: string) {
  const workspace = await loadPlayerWorkspace(userId);
  if (workspace) {
    await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
  }
}

export async function completeStubPayment(paymentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, reason: "auth" as const };
  }
  const actor = await getActorByUserId(session.user.id);
  if (!actor) return { ok: false as const, reason: "auth" as const };

  const payment = await getPaymentById(paymentId);
  if (!payment) return { ok: false as const, reason: "missing" as const };

  const playerOk = Boolean(
    payment.registrationId &&
      authorize(actor, "payment:create_player", {
        ownerUserId: session.user.id,
        teamId: payment.registration?.teamId,
      }).allow &&
      payment.payerUserId === session.user.id,
  );
  const teamOk = Boolean(
    payment.teamId && authorize(actor, "payment:create_team", { teamId: payment.teamId }).allow,
  );
  if (!playerOk && !teamOk) return { ok: false as const, reason: "forbidden" as const };

  const providerPaymentId = payment.providerPaymentId ?? `stub_${payment.id}`;
  const result = await applyProviderResult({
    paymentId: payment.id,
    providerPaymentId,
    status: "SUCCEEDED",
  });
  if (!result.ok && result.reason === "conflict") {
    return {
      ok: true as const,
      next: payment.teamId && !payment.registrationId ? "/squadra" : "/area",
    };
  }
  if (!result.ok) {
    return { ok: false as const, reason: "conflict" as const };
  }

  const paymentNotice = {
    type: "PAYMENT_SUCCEEDED",
    title: "Pagamento ricevuto",
    body: "Il pagamento della quota risulta coperto. Nessun dato della carta è stato salvato su questa piattaforma.",
  };

  if (payment.registration?.playerProfileId) {
    const profile = await prisma.playerProfile.findUnique({
      where: { id: payment.registration.playerProfileId },
      select: { userId: true },
    });
    if (profile) {
      await persistByUser(profile.userId);
      await createNotification({ userId: profile.userId, ...paymentNotice });
    }
  } else if (payment.teamId) {
    const members = await prisma.registration.findMany({
      where: { teamId: payment.teamId },
      select: { playerProfile: { select: { userId: true } } },
    });
    const notified = new Set<string>();
    for (const row of members) {
      const userId = row.playerProfile.userId;
      await persistByUser(userId);
      if (notified.has(userId)) continue;
      notified.add(userId);
      await createNotification({ userId, ...paymentNotice });
    }
  }
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_SUCCEEDED",
    entityType: "Payment",
    entityId: payment.id,
    ...trace,
  });

  return {
    ok: true as const,
    next: payment.teamId && !payment.registrationId ? "/squadra" : "/area",
  };
}
