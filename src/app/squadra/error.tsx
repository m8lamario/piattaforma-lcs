"use client";

import { AppShell } from "@/shared/ui/AppShell";
import { RouteError } from "@/shared/ui/RouteError";

export default function TeamError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell showTeam>
      <RouteError onRetry={reset} />
    </AppShell>
  );
}
