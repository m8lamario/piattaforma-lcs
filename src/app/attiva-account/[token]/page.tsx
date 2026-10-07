import Link from "next/link";
import { ActivationForm } from "@/features/school-access/ui/ActivationForm";
import {
  findSchoolAccessByActivationToken,
  inspectSchoolAccessActivation,
} from "@/features/school-access/data/requests";
import { activationErrorCode } from "@/features/school-access/domain/activation";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { userMessage } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../richiedi-accesso/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ActivateAccountPage({ params }: Props) {
  const { token } = await params;

  if (!isWellFormedInviteToken(token)) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.schoolAccessActivateTitle}</h1>
            <p className={styles.lead}>{userMessage("SCHOOL_ACCESS_TOKEN_INVALID")}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const found = await findSchoolAccessByActivationToken(token);
  const outcome = inspectSchoolAccessActivation(found);
  if (outcome !== "ok" || !found) {
    const code = activationErrorCode(outcome === "ok" ? "invalid" : outcome);
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.schoolAccessActivateTitle}</h1>
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
          <h1>{it.schoolAccessActivateTitle}</h1>
          <ActivationForm token={token} schoolName={found.schoolName} />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
