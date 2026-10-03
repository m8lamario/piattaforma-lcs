import { notFound } from "next/navigation";
import { confirmC1Action } from "@/features/consents/actions";
import { findValidConsentToken } from "@/features/consents/data/tokens";
import { TokenConfirmForm } from "@/features/consents/ui/TokenConfirmForm";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ConfirmParentPage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();
  const found = await findValidConsentToken(token, "C1");
  if (!found) notFound();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          {found.stale === "used" ? (
            <>
              <h1>{it.confirmC1Title}</h1>
              <p>{it.confirmC1Done}</p>
            </>
          ) : found.stale ? (
            <>
              <h1>{it.confirmC1Title}</h1>
              <p>{it.errorCONSENT_TOKEN_INVALID}</p>
            </>
          ) : (
            <TokenConfirmForm
              token={token}
              action={confirmC1Action}
              title={it.confirmC1Title}
              help={`${it.confirmC1Help} ${found.registration.playerProfile.firstName} ${found.registration.playerProfile.lastName}`.trim()}
              submit={it.confirmC1Submit}
              done={it.confirmC1Done}
            />
          )}
        </section>
      </main>
    </PublicShell>
  );
}
