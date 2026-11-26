import { auth } from "@/auth";
import { applyProviderResult, getPaymentById } from "@/features/payments/data/payments";
import {
  loadPlayerWorkspace,
  loadPlayerWorkspacesForTeam,
  persistRegistrationStatus,
  type PlayerWorkspace,
} from "@/features/registrations/data/workspace";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { createNotification } from "@/features/notifications/data/notifications";
import { writeAuditLog } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import { userAgentAndIp } from "@/shared/lib/request-guard";
import { loadActiveAdminView } from "@/shared/lib/readOnlyGuard";

type LoadedPayment = NonNullable<Awaited<ReturnType<typeof getPaymentById>>>;

const paymentNotice = {
  type: "PAYMENT_SUCCEEDED",
  title: "Pagamento ricevuto",
  body: "Il pagamento della quota risulta coperto. Nessun dato della carta è stato salvato su questa piattaforma.",
};

function persistWorkspace(workspace: PlayerWorkspace) {
  return persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus, {
    status: workspace.registration.status,
    userId: workspace.user.id,
  });
}

function nextFor(payment: LoadedPayment) {
  return payment.teamId && !payment.registrationId ? "/squadra" : "/area";
}

export async function completeStubPayment(paymentId: string) {
  if (await loadActiveAdminView()) {
    return { ok: false as const, reason: "readonly" as const };
  }
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
      next: nextFor(payment),
      payment,
      workspace: null as PlayerWorkspace | null,
    };
  }
  if (!result.ok) {
    return { ok: false as const, reason: "conflict" as const };
  }

  const succeeded = { ...payment, status: "SUCCEEDED" as const };
  let workspace: PlayerWorkspace | null = null;

  const playerUserId = payment.registration?.playerProfile.userId;
  if (playerUserId) {
    workspace = await loadPlayerWorkspace(playerUserId);
    await Promise.all([
      workspace ? persistWorkspace(workspace) : Promise.resolve(),
      createNotification({ userId: playerUserId, ...paymentNotice }),
    ]);
  } else if (payment.teamId) {
    const [workspaces, members] = await Promise.all([
      loadPlayerWorkspacesForTeam(payment.teamId),
      prisma.registration.findMany({
        where: { teamId: payment.teamId },
        select: { playerProfile: { select: { userId: true } } },
      }),
    ]);
    const userIds = [...new Set(members.map((row) => row.playerProfile.userId))];
    await Promise.all([
      ...workspaces.map((row) => persistWorkspace(row)),
      ...userIds.map((userId) => createNotification({ userId, ...paymentNotice })),
    ]);
    workspace = workspaces.find((row) => row.user.id === session.user.id) ?? null;
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
    next: nextFor(payment),
    payment: succeeded,
    workspace,
  };
}
