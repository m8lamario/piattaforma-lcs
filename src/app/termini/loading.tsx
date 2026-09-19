import { PublicShell } from "@/shared/ui/PublicShell";
import { LegalArticleSkeleton } from "@/shared/ui/Skeleton";

export default function TermsLoading() {
  return (
    <PublicShell>
      <LegalArticleSkeleton />
    </PublicShell>
  );
}
