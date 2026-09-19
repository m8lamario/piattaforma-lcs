import { AppShell } from "@/shared/ui/AppShell";
import { PaymentResultSkeleton } from "@/shared/ui/Skeleton";

export default function PaymentResultLoading() {
  return (
    <AppShell>
      <PaymentResultSkeleton />
    </AppShell>
  );
}
