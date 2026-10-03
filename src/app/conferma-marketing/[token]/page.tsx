import { notFound } from "next/navigation";
import { confirmMarketingAction } from "@/features/consents/actions";
import { findValidConsentToken } from "@/features/consents/data/tokens";
import { TokenConfirmForm } from "@/features/consents/ui/TokenConfirmForm";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ConfirmMarketingPage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();
  const found = await findValidConsentToken(token, "MARKETING");
  if (!found) notFound();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          {found.stale === "used" ? (
            <>
              <h1>{it.confirmMarketingTitle}</h1>
              <p>{it.confirmMarketingDone}</p>
            </>
          ) : found.stale ? (
            <>
              <h1>{it.confirmMarketingTitle}</h1>
              <p>{it.errorCONSENT_TOKEN_INVALID}</p>
            </>
          ) : (
            <TokenConfirmForm
              token={token}
              action={confirmMarketingAction}
              title={it.confirmMarketingTitle}
              help={it.confirmMarketingHelp}
              submit={it.confirmMarketingSubmit}
              done={it.confirmMarketingDone}
            />
          )}
        </section>
      </main>
    </PublicShell>
  );
}
