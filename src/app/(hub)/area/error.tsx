"use client";

import { RouteError } from "@/shared/ui/RouteError";

export default function AreaError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError onRetry={reset} />;
}
