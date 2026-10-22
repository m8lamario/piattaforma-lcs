"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { paymentAdapter } from "@/shared/adapters";
import { claimCheckoutPayment, rememberStripeCustomer } from "@/features/payments/data/payments";
import { checkoutCustomerPrefill } from "@/features/payments/domain/billing";
import {
  applyPendingSnapshot,
  decimalToCents,
  resolveParticipantFee,
  resolveTeamFee,
} from "@/features/payments/domain/fees";
import { feeCheckoutBlocker } from "@/features/payments/domain/integrity";
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
import { appOrigin } from "@/shared/config/app";

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, stripeCustomerId: true },
  });
  if (!user?.emailVerified) return fail("AUTH_EMAIL_NOT_VERIFIED");
  if (workspace.evidence.isMinor && workspace.evidence.guardianAuthorization !== "authorized") {
    return fail("PAYMENT_GUARDIAN_REQUIRED");
  }

  const registration = await prisma.registration.findUnique({
    where: { id: workspace.registration.id },
    select: {
      id: true,
      editionId: true,
      category: true,
      team: {
        select: {
          editionId: true,
          playerFeeCents: true,
          staffFeeCents: true,
          edition: {
            select: {
              paymentMode: true,
              currency: true,
              playerFeeAmount: true,
              staffFeeAmount: true,
            },
          },
        },
      },
    },
  });
  if (!registration || registration.team.editionId !== registration.editionId) {
    return fail("PAYMENT_SCOPE_MISMATCH");
  }
  const pending = await prisma.payment.findFirst({
    where: { registrationId: registration.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { amount: true },
  });
  const presented = applyPendingSnapshot(
    decimalToCents(pending?.amount),
    resolveParticipantFee({
      category: registration.category,
      paymentMode: registration.team.edition.paymentMode,
      teamPlayerFeeCents: registration.team.playerFeeCents,
      teamStaffFeeCents: registration.team.staffFeeCents,
      editionPlayerFee: registration.team.edition.playerFeeAmount,
      editionStaffFee: registration.team.edition.staffFeeAmount,
    }),
  );
  const blocked = feeCheckoutBlocker({
    covered: isPaymentCovered(workspace.evidence.payment),
    fee: presented,
    channel: "player",
  });
  if (blocked) return fail(blocked);
  if (presented.status !== "ready") return fail("PAYMENT_FEE_MISSING");

  const claimed = await claimCheckoutPayment({
    editionId: registration.editionId,
    registrationId: registration.id,
    payerUserId: session.user.id,
    amountCents: presented.cents,
    currency: registration.team.edition.currency,
  });
  if (!claimed.ok) {
    return fail(claimed.reason === "scope" ? "PAYMENT_SCOPE_MISMATCH" : "PAYMENT_ALREADY_COMPLETED");
  }
  const chargeCents = decimalToCents(claimed.payment.amount);
  if (chargeCents === null) return fail("PAYMENT_FEE_MISSING");

  const prefill = checkoutCustomerPrefill({
    email: user.email,
    firstName: workspace.profile.firstName,
    lastName: workspace.profile.lastName,
  });
  const checkout = await paymentAdapter.createCheckout({
    amount: chargeCents,
    currency: registration.team.edition.currency,
    reference: claimed.payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${claimed.payment.id}`,
    cancelUrl: `${appOrigin()}/area/registrazione/pagamento`,
    customer: { ...prefill, stripeCustomerId: user.stripeCustomerId },
  });
  await rememberStripeCustomer(session.user.id, checkout.stripeCustomerId);

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
    metadata: {
      amountCents: chargeCents,
      currency: registration.team.edition.currency,
      category: workspace.registration.category,
      reused: claimed.reused,
    },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}

export async function startTeamCheckoutAction(teamId: string): Promise<ActionFailure | void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/squadra");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");

  if (!authorize(actor, "payment:create_team", { teamId }).allow) {
    return fail("FORBIDDEN_PAYMENT_TEAM");
  }
  const team = await getTeamForActor(teamId);
  if (!team) return fail("TEAM_NOT_FOUND");
  if (
    !authorize(actor, "payment:create_team", {
      teamId: team.id,
      competitionId: team.edition.competitionId,
    }).allow
  ) {
    return fail("FORBIDDEN_PAYMENT_TEAM");
  }
  if (
    !isRegistrationWindowOpen({
      isActive: team.edition.isActive,
      registrationOpensAt: team.edition.registrationOpensAt,
      registrationClosesAt: team.edition.registrationClosesAt,
    })
  ) {
    return fail("REGISTRATION_WINDOW_CLOSED");
  }

  const pending = await prisma.payment.findFirst({
    where: { teamId: team.id, registrationId: null, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { amount: true },
  });
  const already = await prisma.payment.findFirst({
    where: { teamId: team.id, registrationId: null, status: "SUCCEEDED" },
    select: { id: true },
  });
  const presented = applyPendingSnapshot(
    decimalToCents(pending?.amount),
    resolveTeamFee({
      paymentMode: team.edition.paymentMode,
      teamFeeCents: team.teamFeeCents,
      editionTeamFee: team.edition.teamFeeAmount,
    }),
  );
  const blocked = feeCheckoutBlocker({
    covered: Boolean(already),
    fee: presented,
    channel: "team",
  });
  if (blocked) return fail(blocked);
  if (presented.status !== "ready") return fail("PAYMENT_FEE_MISSING");

  const claimed = await claimCheckoutPayment({
    editionId: team.editionId,
    teamId: team.id,
    payerUserId: session.user.id,
    amountCents: presented.cents,
    currency: team.edition.currency,
  });
  if (!claimed.ok) {
    return fail(claimed.reason === "scope" ? "PAYMENT_SCOPE_MISMATCH" : "PAYMENT_ALREADY_COMPLETED");
  }
  const chargeCents = decimalToCents(claimed.payment.amount);
  if (chargeCents === null) return fail("PAYMENT_FEE_MISSING");

  const payer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, stripeCustomerId: true, playerProfile: { select: { firstName: true, lastName: true } } },
  });
  const teamPrefill = checkoutCustomerPrefill({
    email: payer?.email,
    firstName: payer?.playerProfile?.firstName,
    lastName: payer?.playerProfile?.lastName,
  });
  const checkout = await paymentAdapter.createCheckout({
    amount: chargeCents,
    currency: team.edition.currency,
    reference: claimed.payment.id,
    successUrl: `${appOrigin()}/area/pagamento/esito?paymentId=${claimed.payment.id}`,
    cancelUrl: `${appOrigin()}/squadra`,
    customer: { ...teamPrefill, stripeCustomerId: payer?.stripeCustomerId },
  });
  await rememberStripeCustomer(session.user.id, checkout.stripeCustomerId);

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
    metadata: { amountCents: chargeCents, team: true, reused: claimed.reused },
    ...trace,
  });

  redirect(checkout.redirectUrl);
}
