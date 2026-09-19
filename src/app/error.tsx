"use client";

import { PublicShell } from "@/shared/ui/PublicShell";
import { PublicRouteErrorFrame, RouteError } from "@/shared/ui/RouteError";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PublicShell>
      <PublicRouteErrorFrame>
        <RouteError onRetry={reset} homeHref="/" />
      </PublicRouteErrorFrame>
    </PublicShell>
  );
}
