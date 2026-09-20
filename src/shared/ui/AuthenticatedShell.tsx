import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "./AppShell";
import { loadAppShell } from "./loadAppShell";

type Props = {
  children: ReactNode;
};

/** Shared authenticated chrome: keeps nav props stable across page/loading swaps. */
export async function AuthenticatedShell({ children }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/accedi");
  }

  const shell = await loadAppShell(session.user.id);

  return (
    <AppShell
      email={session.user.email}
      showTeam={shell.showTeam}
      showAdmin={shell.showAdmin}
      showPlayerTeam={shell.showPlayerTeam}
      unreadCount={shell.unreadCount}
    >
      {children}
    </AppShell>
  );
}
