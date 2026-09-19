import { AppShell } from "@/shared/ui/AppShell";
import { WizardSkeleton } from "@/shared/ui/Skeleton";

export default function RegistrationLoading() {
  return (
    <AppShell>
      <WizardSkeleton />
    </AppShell>
  );
}
