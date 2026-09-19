import { PublicShell } from "@/shared/ui/PublicShell";
import { AuthCardSkeleton } from "@/shared/ui/Skeleton";

export default function InviteRedeemLoading() {
  return (
    <PublicShell>
      <AuthCardSkeleton />
    </PublicShell>
  );
}
