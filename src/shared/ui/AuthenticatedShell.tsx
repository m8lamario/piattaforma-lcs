import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/shared/authz/requestIdentity";
import { AppShell } from "./AppShell";
import { loadAppShell } from "./loadAppShell";
import { homeForShellFlags } from "./shellNav";

type Props = {
  children: ReactNode;
};

/** Shared authenticated chrome: keeps nav props stable across page/loading swaps. */
export async function AuthenticatedShell({ children }: Props) {
  const pathname = (await headers()).get("x-pathname") ?? "/area";
  const identity = await requirePageUser(pathname);
  const shell = await loadAppShell(identity.subjectUserId);
  if (identity.view && pathname.startsWith("/admin") && !shell.showAdmin) {
    redirect(homeForShellFlags(shell));
  }

  return (
    <AppShell
      email={identity.view ? identity.subjectEmail : identity.sessionEmail}
      showTeam={shell.showTeam}
      showAdmin={shell.showAdmin}
      showPlayerTeam={shell.showPlayerTeam}
      showConsents={shell.showConsents}
      showSchool={shell.showSchool}
      showMedia={shell.showMedia}
      mediaUnderAdmin={shell.mediaUnderAdmin}
      showArea={shell.showArea}
      unreadCount={shell.unreadCount}
    >
      {children}
    </AppShell>
  );
}
