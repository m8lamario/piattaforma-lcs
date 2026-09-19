"use client";

import { AppShell } from "@/shared/ui/AppShell";
import { RouteError } from "@/shared/ui/RouteError";

export default function AdminDocumentsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell showAdmin>
      <RouteError onRetry={reset} />
    </AppShell>
  );
}
