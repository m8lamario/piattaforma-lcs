import { AppShell } from "@/shared/ui/AppShell";
import { AdminDocumentDetailSkeleton } from "@/shared/ui/Skeleton";

export default function AdminDocumentDetailLoading() {
  return (
    <AppShell showAdmin>
      <AdminDocumentDetailSkeleton />
    </AppShell>
  );
}
