import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { completeStubPayment } from "@/features/payments/data/complete";
import { getPaymentById } from "@/features/payments/data/payments";
import { PaymentStatusView } from "@/features/payments/ui/PaymentStatusView";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { nextHero } from "@/features/registrations/domain/wizard";
import { shouldCompletePaymentOnReturn } from "@/shared/config/drivers";
import { authorize } from "@/shared/authz/authorize";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";

type Props = {
  searchParams: Promise<{ paymentId?: string }>;
};

export default async function PaymentResultPage({ searchParams }: Props) {
  const { paymentId } = await searchParams;
  if (!paymentId) redirect("/area");
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=/area/pagamento/esito?paymentId=${paymentId}`);
  }

  if (shouldCompletePaymentOnReturn()) {
    const result = await completeStubPayment(paymentId);
    if (!result.ok) {
      if (result.reason === "auth") redirect(`/accedi?next=/area/pagamento/esito?paymentId=${paymentId}`);
      redirect("/area");
    }
  }

  const [payment, shell] = await Promise.all([getPaymentById(paymentId), loadAppShell(session.user.id)]);
  if (!payment || !shell.actor) redirect("/area");
  const playerOk = Boolean(
    payment.registrationId &&
      authorize(shell.actor, "payment:create_player", {
        ownerUserId: session.user.id,
        teamId: payment.registration?.teamId,
      }).allow &&
      payment.payerUserId === session.user.id,
  );
  const teamOk = Boolean(
    payment.teamId && authorize(shell.actor, "payment:create_team", { teamId: payment.teamId }).allow,
  );
  if (!playerOk && !teamOk) redirect("/area");

  const teamPayment = Boolean(payment.teamId && !payment.registrationId);
  let nextHref = teamPayment ? "/squadra" : "/area";
  let nextLabel = teamPayment ? it.navTeam : it.backToArea;
  if (payment.status === "SUCCEEDED" && !teamPayment) {
    const workspace = await loadPlayerWorkspace(session.user.id);
    const remaining = workspace ? nextHero(workspace.checklist).code !== "DONE" : false;
    nextHref = remaining ? "/area/registrazione" : "/area";
    nextLabel = remaining ? it.ctaContinue : it.backToArea;
  }

  return (
    <main>
      <PageHeader title={it.stepPagamento} />
      <PaymentStatusView status={payment.status} teamPayment={teamPayment} nextHref={nextHref} nextLabel={nextLabel} />
    </main>
  );
}
