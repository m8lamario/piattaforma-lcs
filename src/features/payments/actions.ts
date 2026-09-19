"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { paymentAdapter } from "@/shared/adapters";
import { createPendingPayment } from "@/features/payments/data/payments";
import { playerCheckoutAmount, teamCheckoutAmount } from "@/features/payments/domain/amounts";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";
import { getTeamForActor } from "@/features/teams/data/invites";
import { prisma } from "@/shared/lib/prisma";
import { userAgentAndIp } from "@/shared/lib/request-guard";

function appOrigin() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function startPlayerCheckoutAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/registrazione/pagamento");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) return { error: "Non hai un’iscrizione da completare." };

  const allowed = authorize(actor, "payment:create_player", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) return { error: "Non puoi pagare questa iscrizione." };

  if (isPaymentCovered(workspace.evidence.payment)) {
    return { error: "Il pagamento è già coperto. Non viene addebitato un secondo importo." };
  }

  const amount = playerCheckoutAmount({
    paymentMode: workspace.registration.paymentMode,
    playerFeeAmount: workspace.registration.playerFeeAmount,
  });
  if (amount === null) {
    return { error: "Per questa edizione il pagamento è a carico della squadra." };
  }

  const payment = await createPendingPayment({
    editionId: workspace.registration.editionId,
    registrationId: workspace.registration.id,
    payerUserId: session.user.id,
    amount,
    currency: workspace.registration.currency,
  });

  const checkout = await paymentAdapter.createCheckout({
    amount: Math.round(amount * 100),
    currency: workspace.registration.currency,
    reference: payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${payment.id}`,
    cancelUrl: `${appOrigin()}/area/registrazione/pagamento`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerSessionId: checkout.providerRef },
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_CHECKOUT",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { amount, currency: workspace.registration.currency },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}

export async function startTeamCheckoutAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/squadra");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  const allowed = authorize(actor, "payment:create_team", { teamId });
  if (!allowed.allow) return { error: "Solo il rappresentante può pagare per la squadra." };

  const team = await getTeamForActor(teamId);
  if (!team) return { error: "Squadra non trovata." };

  const already = await prisma.payment.findFirst({
    where: { teamId, status: "SUCCEEDED" },
  });
  if (already) {
    return { error: "La squadra ha già un pagamento riuscito. Nessun secondo addebito." };
  }

  const amount = teamCheckoutAmount({
    paymentMode: team.edition.paymentMode,
    teamFeeAmount: team.edition.teamFeeAmount,
  });
  if (amount === null) {
    return { error: "Per questa edizione il pagamento è a carico del giocatore." };
  }

  const payment = await createPendingPayment({
    editionId: team.editionId,
    teamId,
    payerUserId: session.user.id,
    amount,
    currency: team.edition.currency,
  });

  const checkout = await paymentAdapter.createCheckout({
    amount: Math.round(amount * 100),
    currency: team.edition.currency,
    reference: payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${payment.id}`,
    cancelUrl: `${appOrigin()}/squadra`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerSessionId: checkout.providerRef },
  });

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_CHECKOUT",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { amount, team: true },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}
