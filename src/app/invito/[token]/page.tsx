import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/features/auth/actions";
import { findInviteByPlainToken, loadRedeemContext } from "@/features/teams/data/invites";
import { decideRedeemPath } from "@/features/teams/domain/invite";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { RedeemForm } from "@/features/teams/ui/RedeemForm";
import { AttachInviteForm } from "@/features/teams/ui/AttachInviteForm";
import { it } from "@/shared/i18n/it";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { Button } from "@/shared/ui/Button";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ token: string }>;
};

function InviteMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className={styles.card}>
      <h1>{title}</h1>
      <p>{body}</p>
      <Link href="/accedi">{it.ctaLogin}</Link>
    </section>
  );
}

export default async function InviteRedeemPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!isWellFormedInviteToken(token)) {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body={it.inviteInvalid} />
      </main>
    );
  }

  const found = await findInviteByPlainToken(token);
  const outcome = found?.inspection.outcome ?? "invalid";

  if (outcome === "expired") {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body={it.inviteExpired} />
      </main>
    );
  }
  if (outcome === "already_used") {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body={it.inviteUsed} />
      </main>
    );
  }
  if (outcome === "revoked") {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body={it.inviteRevoked} />
      </main>
    );
  }
  const inspection = found?.inspection;
  if (!found || !inspection || inspection.outcome !== "redeemable") {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body={it.inviteInvalid} />
      </main>
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
      <main className={styles.main}>
        <section className={styles.card}>
          <h1>{it.inviteCreateAccount}</h1>
          <RedeemForm
            token={token}
            email={inspection.email}
            teamName={inspection.teamName}
            firstName={inspection.firstName}
            lastName={inspection.lastName}
          />
        </section>
      </main>
    );
  }

  if (path.path === "login_required") {
    return (
      <main className={styles.main}>
        <section className={styles.card}>
          <h1>{it.inviteTitle}</h1>
          <p>
            Esiste già un account per {inspection.email}. Accedi per unirti a{" "}
            {inspection.teamName}.
          </p>
          <LoginForm nextPath={`/invito/${token}`} />
        </section>
      </main>
    );
  }

  if (path.path === "attach_existing") {
    return (
      <main className={styles.main}>
        <section className={styles.card}>
          <h1>{it.inviteTitle}</h1>
          <AttachInviteForm token={token} teamName={inspection.teamName} />
        </section>
      </main>
    );
  }

  if (path.path === "already_on_team") {
    return (
      <main className={styles.main}>
        <InviteMessage title={it.inviteTitle} body="Sei già in questa squadra." />
      </main>
    );
  }

  if (path.path === "wrong_session_email") {
    return (
      <main className={styles.main}>
        <section className={styles.card}>
          <h1>{it.inviteTitle}</h1>
          <p>Sei connesso con un account diverso da quello dell’invito. Esci e riprova con l’email dell’invito.</p>
          <form action={logoutAction}>
            <input type="hidden" name="next" value={`/invito/${token}`} />
            <Button type="submit">{it.logoutRetryInvite}</Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <InviteMessage
        title={it.inviteTitle}
        body="Sei già iscritto a un’altra competizione. Contatta l’organizzazione."
      />
    </main>
  );
}
