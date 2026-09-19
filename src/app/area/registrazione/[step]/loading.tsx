import { AppShell } from "@/shared/ui/AppShell";
import { WizardSkeleton } from "@/shared/ui/Skeleton";

export default function WizardStepLoading() {
  return (
    <AppShell>
      <WizardSkeleton />
    </AppShell>
  );
}
