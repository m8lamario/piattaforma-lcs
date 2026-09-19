import { AppShell } from "@/shared/ui/AppShell";
import { AdminDocumentsSkeleton } from "@/shared/ui/Skeleton";

export default function AdminDocumentsLoading() {
  return (
    <AppShell showAdmin>
      <AdminDocumentsSkeleton />
    </AppShell>
  );
}
