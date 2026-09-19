import { AppShell } from "@/shared/ui/AppShell";
import { CommunicationsSkeleton } from "@/shared/ui/Skeleton";

export default function CommunicationsLoading() {
  return (
    <AppShell>
      <CommunicationsSkeleton />
    </AppShell>
  );
}
