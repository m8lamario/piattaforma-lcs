import { AppShell } from "@/shared/ui/AppShell";
import { DashboardSkeleton } from "@/shared/ui/Skeleton";

export default function AccountLoading() {
  return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );
}
