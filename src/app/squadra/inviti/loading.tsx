import { AppShell } from "@/shared/ui/AppShell";
import { TeamSkeleton } from "@/shared/ui/Skeleton";

export default function TeamInvitesLoading() {
  return (
    <AppShell showTeam>
      <TeamSkeleton />
    </AppShell>
  );
}
