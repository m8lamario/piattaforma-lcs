import { AppShell } from "@/shared/ui/AppShell";
import { TeamSkeleton } from "@/shared/ui/Skeleton";

export default function PlayerTeamLoading() {
  return (
    <AppShell>
      <TeamSkeleton />
    </AppShell>
  );
}
