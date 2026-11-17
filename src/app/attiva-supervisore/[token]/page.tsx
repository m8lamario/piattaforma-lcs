import Link from "next/link";
import { SupervisorActivationForm } from "@/features/league/ui/SupervisorActivationForm";
import {
  findLeagueSupervisorByActivationToken,
  inspectLeagueSupervisorActivation,
} from "@/features/league/data/accounts";
import { leagueActivationErrorCode } from "@/features/league/domain/activation";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { userMessage } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../richiedi-accesso/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function ActivateSupervisorPage({ params }: Props) {
  const { token } = await params;

  if (!isWellFormedInviteToken(token)) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.leagueActivateTitle}</h1>
            <p className={styles.lead}>{userMessage("LEAGUE_TOKEN_INVALID")}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const found = await findLeagueSupervisorByActivationToken(token);
  const outcome = inspectLeagueSupervisorActivation(found);
  if (outcome !== "ok" || !found) {
    const code = leagueActivationErrorCode(outcome === "ok" ? "invalid" : outcome);
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.sheet}>
            <h1>{it.leagueActivateTitle}</h1>
            <p className={styles.lead}>{userMessage(code)}</p>
            <ButtonLink href="/accedi">{it.ctaLogin}</ButtonLink>
          </section>
        </main>
      </PublicShell>
    );
  }

  const editionTitle = `${found.edition.competition.name} · ${found.edition.name}`;

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <p className={styles.kicker}>{it.brandOrg}</p>
          <h1>{it.leagueActivateTitle}</h1>
          <SupervisorActivationForm token={token} editionTitle={editionTitle} />
          <Link href="/accedi" className={styles.back}>
            {it.ctaLogin}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
