import Link from "next/link";
import { MediaPartnerActivationForm } from "@/features/media-partners/ui/ActivationForm";
import {
  findMediaPartnerByActivationToken,
  inspectMediaPartnerActivation,
} from "@/features/media-partners/data/partners";
import { mediaActivationErrorCode } from "@/features/media-partners/domain/activation";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { userMessage } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../richiedi-accesso/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ActivateMediaPage({ params }: Props) {
  const { token } = await params;

  if (!isWellFormedInviteToken(token)) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.mediaActivateTitle}</h1>
            <p className={styles.lead}>{userMessage("MEDIA_PARTNER_TOKEN_INVALID")}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const found = await findMediaPartnerByActivationToken(token);
  const outcome = inspectMediaPartnerActivation(found);
  if (outcome !== "ok" || !found) {
    const code = mediaActivationErrorCode(outcome === "ok" ? "invalid" : outcome);
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.mediaActivateTitle}</h1>
            <p className={styles.lead}>{userMessage(code)}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <p className={styles.kicker}>{it.brandOrg}</p>
          <h1>{it.mediaActivateTitle}</h1>
          <MediaPartnerActivationForm token={token} partnerName={found.organization.name} />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
