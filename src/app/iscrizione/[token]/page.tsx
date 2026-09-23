import type { ReactNode } from "react";
import { auth } from "@/auth";
import { logoutAction } from "@/features/auth/actions";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { findTeamByRegistrationToken, loadRedeemContext } from "@/features/teams/data/invites";
import { decideTeamJoinPath } from "@/features/teams/domain/invite";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { isRegistrationWindowOpen } from "@/features/registrations/domain/window";
import { AttachTeamForm } from "@/features/teams/ui/AttachTeamForm";
import { TeamJoinForm } from "@/features/teams/ui/TeamJoinForm";
import { userMessage } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "@/app/invito/[token]/page.module.css";

type Props = {
  params: Promise<{ token: string }>;
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <main className={styles.main}>{children}</main>
    </PublicShell>
  );
}

function JoinMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className={styles.sheet}>
      <h1>{title}</h1>
      <p>{body}</p>
      <ButtonLink href="/accedi" variant="ghost">
        {it.ctaLogin}
      </ButtonLink>
    </section>
  );
}

export default async function TeamJoinPage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) {
    return (
      <Frame>
        <JoinMessage title={it.inviteTitle} body={userMessage("INVITE_INVALID")} />
      </Frame>
    );
  }

  const team = await findTeamByRegistrationToken(token);
  if (!team) {
    return (
      <Frame>
        <JoinMessage title={it.inviteTitle} body={userMessage("INVITE_INVALID")} />
      </Frame>
    );
  }

  const windowOpen = isRegistrationWindowOpen({
    isActive: team.edition.isActive,
    registrationOpensAt: team.edition.registrationOpensAt,
    registrationClosesAt: team.edition.registrationClosesAt,
  });
  if (!windowOpen) {
    return (
      <Frame>
        <JoinMessage title={it.inviteTitle} body={userMessage("REGISTRATION_WINDOW_CLOSED")} />
      </Frame>
    );
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteCreateAccount}</h1>
          <TeamJoinForm token={token} teamName={team.name} />
        </section>
      </Frame>
    );
  }

  const context = await loadRedeemContext(session.user.email);
  const path = decideTeamJoinPath({
    email: session.user.email,
    teamId: team.id,
    editionId: team.editionId,
    existingUser: context.existingUser,
    session: { userId: session.user.id, email: session.user.email },
    existingRegistrations: context.existingRegistrations,
  });

  if (path.path === "attach_existing" || path.path === "create_account") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteTitle}</h1>
          <p>{it.teamJoinSession.replace("{email}", session.user.email).replace("{team}", team.name)}</p>
          <AttachTeamForm token={token} teamName={team.name} />
        </section>
      </Frame>
    );
  }

  if (path.path === "already_on_team") {
    return (
      <Frame>
        <JoinMessage title={it.inviteTitle} body={userMessage("INVITE_ALREADY_ON_TEAM")} />
      </Frame>
    );
  }

  if (path.path === "login_required" || path.path === "wrong_session_email") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteTitle}</h1>
          <p>{userMessage("INVITE_WRONG_SESSION")}</p>
          <form action={logoutAction}>
            <input type="hidden" name="next" value={`/iscrizione/${token}`} />
            <Button type="submit">{it.logoutRetryInvite}</Button>
          </form>
          <LoginForm nextPath={`/iscrizione/${token}`} />
        </section>
      </Frame>
    );
  }

  return (
    <Frame>
      <JoinMessage title={it.inviteTitle} body={userMessage("INVITE_EDITION_CONFLICT")} />
    </Frame>
  );
}
