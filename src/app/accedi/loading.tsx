import { PublicShell } from "@/shared/ui/PublicShell";
import { AuthCardSkeleton } from "@/shared/ui/Skeleton";

export default function LoginLoading() {
  return (
    <PublicShell>
      <AuthCardSkeleton />
    </PublicShell>
  );
}
