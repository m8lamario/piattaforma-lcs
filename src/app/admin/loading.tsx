import { AdminDocumentsSkeleton } from "@/shared/ui/Skeleton";
import { AppShell } from "@/shared/ui/AppShell";

export default function AdminLoading() {
  return (
    <AppShell showAdmin>
      <AdminDocumentsSkeleton />
    </AppShell>
  );
}
