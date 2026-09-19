"use client";

import { AppShell } from "@/shared/ui/AppShell";
import { RouteError } from "@/shared/ui/RouteError";

export default function AreaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <RouteError onRetry={reset} />
    </AppShell>
  );
}
