import { PublicShell } from "@/shared/ui/PublicShell";
import { LegalArticleSkeleton } from "@/shared/ui/Skeleton";

export default function LegalVersionLoading() {
  return (
    <PublicShell>
      <LegalArticleSkeleton />
    </PublicShell>
  );
}
