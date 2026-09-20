"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { paymentAdapter } from "@/shared/adapters";
import { claimCheckoutPayment } from "@/features/payments/data/payments";
import { playerCheckoutAmount, teamCheckoutAmount } from "@/features/payments/domain/amounts";
import { playerCheckoutBlocker, teamCheckoutBlocker } from "@/features/payments/domain/integrity";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { workspaceWriteCode } from "@/features/registrations/domain/writeGate";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { fail, type ActionFailure } from "@/shared/errors";
import { writeAuditLog } from "@/shared/lib/audit";
import { getTeamForActor } from "@/features/teams/data/invites";
import { prisma } from "@/shared/lib/prisma";
import { userAgentAndIp } from "@/shared/lib/request-guard";

function appOrigin() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function startPlayerCheckoutAction(): Promise<ActionFailure | void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione/pagamento");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) return fail("REGISTRATION_NOT_FOUND");

  const allowed = authorize(actor, "payment:create_player", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) return fail("FORBIDDEN_PAYMENT_PLAYER");
  const windowCode = workspaceWriteCode(workspace.registration);
  if (windowCode) return fail(windowCode);

  const amount = playerCheckoutAmount({
    paymentMode: workspace.registration.paymentMode,
    playerFeeAmount: workspace.registration.playerFeeAmount,
  });
  const blocked = playerCheckoutBlocker({
    covered: isPaymentCovered(workspace.evidence.payment),
    amount,
  });
  if (blocked) return fail(blocked);
  if (amount === null) return fail("PAYMENT_TEAM_PAYS");

  const claimed = await claimCheckoutPayment({
    editionId: workspace.registration.editionId,
    registrationId: workspace.registration.id,
    payerUserId: session.user.id,
    amount,
    currency: workspace.registration.currency,
  });
  if (!claimed.ok) return fail("PAYMENT_ALREADY_COMPLETED");

  const checkout = await paymentAdapter.createCheckout({
    amount: Math.round(amount * 100),
    currency: workspace.registration.currency,
    reference: claimed.payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${claimed.payment.id}`,
    cancelUrl: `${appOrigin()}/area/registrazione/pagamento`,
  });

  await prisma.payment.update({
    where: { id: claimed.payment.id },
    data: { providerSessionId: checkout.providerRef },
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_CHECKOUT",
    entityType: "Payment",
    entityId: claimed.payment.id,
    metadata: { amount, currency: workspace.registration.currency, reused: claimed.reused },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}

export async function startTeamCheckoutAction(teamId: string): Promise<ActionFailure | void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/squadra");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const allowed = authorize(actor, "payment:create_team", { teamId });
  if (!allowed.allow) return fail("FORBIDDEN_PAYMENT_TEAM");

  const team = await getTeamForActor(teamId);
  if (!team) return fail("TEAM_NOT_FOUND");
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }

  const amount = teamCheckoutAmount({
    paymentMode: team.edition.paymentMode,
    teamFeeAmount: team.edition.teamFeeAmount,
  });
  const already = await prisma.payment.findFirst({
    where: { teamId, status: "SUCCEEDED" },
  });
  const blocked = teamCheckoutBlocker({ covered: Boolean(already), amount });
  if (blocked) return fail(blocked);
  if (amount === null) return fail("PAYMENT_PLAYER_PAYS");

  const claimed = await claimCheckoutPayment({
    editionId: team.editionId,
    teamId,
    payerUserId: session.user.id,
    amount,
    currency: team.edition.currency,
  });
  if (!claimed.ok) return fail("PAYMENT_ALREADY_COMPLETED");

  const checkout = await paymentAdapter.createCheckout({
    amount: Math.round(amount * 100),
    currency: team.edition.currency,
    reference: claimed.payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${claimed.payment.id}`,
    cancelUrl: `${appOrigin()}/squadra`,
  });

  await prisma.payment.update({
    where: { id: claimed.payment.id },
    data: { providerSessionId: checkout.providerRef },
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_CHECKOUT",
    entityType: "Payment",
    entityId: claimed.payment.id,
    metadata: { amount, team: true, reused: claimed.reused },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}
