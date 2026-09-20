import type { ReactNode } from "react";
import { auth } from "@/auth";
import { logoutAction } from "@/features/auth/actions";
import { findInviteByPlainToken, loadRedeemContext } from "@/features/teams/data/invites";
import { decideRedeemPath } from "@/features/teams/domain/invite";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { userMessage } from "@/shared/errors";
import { RedeemForm } from "@/features/teams/ui/RedeemForm";
import { AttachInviteForm } from "@/features/teams/ui/AttachInviteForm";
import { it } from "@/shared/i18n/it";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./page.module.css";

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

function InviteMessage({ title, body }: { title: string; body: string }) {
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

export default async function InviteRedeemPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!isWellFormedInviteToken(token)) {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_INVALID")} />
      </Frame>
    );
  }

  const found = await findInviteByPlainToken(token);
  const outcome = found?.inspection.outcome ?? "invalid";

  if (outcome === "expired") {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_EXPIRED")} />
      </Frame>
    );
  }
  if (outcome === "already_used") {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_ALREADY_USED")} />
      </Frame>
    );
  }
  if (outcome === "revoked") {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_REVOKED")} />
      </Frame>
    );
  }
  const inspection = found?.inspection;
  if (!found || !inspection || inspection.outcome !== "redeemable") {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_INVALID")} />
      </Frame>
    );
  }

  const context = await loadRedeemContext(inspection.email);
  const path = decideRedeemPath({
    inspection,
    existingUser: context.existingUser,
    session: session?.user?.id
      ? { userId: session.user.id, email: session.user.email ?? "" }
      : null,
    existingRegistrations: context.existingRegistrations,
  });

  if (path.path === "create_account") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteCreateAccount}</h1>
          <RedeemForm
            token={token}
            email={inspection.email}
            teamName={inspection.teamName}
            firstName={inspection.firstName}
            lastName={inspection.lastName}
          />
        </section>
      </Frame>
    );
  }

  if (path.path === "login_required") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteTitle}</h1>
          <p>
            {it.inviteLoginExisting
              .replace("{email}", inspection.email)
              .replace("{team}", inspection.teamName)}
          </p>
          <LoginForm nextPath={`/invito/${token}`} />
        </section>
      </Frame>
    );
  }

  if (path.path === "attach_existing") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteTitle}</h1>
          <AttachInviteForm token={token} teamName={inspection.teamName} />
        </section>
      </Frame>
    );
  }

  if (path.path === "already_on_team") {
    return (
      <Frame>
        <InviteMessage title={it.inviteTitle} body={userMessage("INVITE_ALREADY_ON_TEAM")} />
      </Frame>
    );
  }

  if (path.path === "wrong_session_email") {
    return (
      <Frame>
        <section className={styles.sheet}>
          <h1>{it.inviteTitle}</h1>
          <p>{userMessage("INVITE_WRONG_SESSION")}</p>
          <form action={logoutAction}>
            <input type="hidden" name="next" value={`/invito/${token}`} />
            <Button type="submit">{it.logoutRetryInvite}</Button>
          </form>
        </section>
      </Frame>
    );
  }

  return (
    <Frame>
      <InviteMessage
        title={it.inviteTitle}
        body={userMessage("INVITE_EDITION_CONFLICT")}
      />
    </Frame>
  );
}
