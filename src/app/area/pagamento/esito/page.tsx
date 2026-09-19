import { redirect } from "next/navigation";
import { completeStubPayment } from "@/features/payments/data/complete";

type Props = {
  searchParams: Promise<{ paymentId?: string }>;
};

export default async function PaymentResultPage({ searchParams }: Props) {
  const { paymentId } = await searchParams;
  if (!paymentId) redirect("/area");
  const result = await completeStubPayment(paymentId);
  if (!result.ok) {
    if (result.reason === "auth") redirect(`/accedi?next=/area/pagamento/esito?paymentId=${paymentId}`);
    redirect("/area");
  }
  redirect(result.next);
}
