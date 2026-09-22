import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/shared/ui/AuthenticatedShell";

/**
 * Shared authenticated chrome for /area, /squadra, /admin.
 * Keeps AppShell/AppNav mounted across navigations so menu items never flash away.
 */
export default function HubLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
