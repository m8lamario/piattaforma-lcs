import { AppShell } from "@/shared/ui/AppShell";
import { DashboardSkeleton } from "@/shared/ui/Skeleton";

export default function AreaLoading() {
  return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );
}
