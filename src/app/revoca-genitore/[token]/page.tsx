import { notFound } from "next/navigation";
import { loadGuardianLink } from "@/features/consents/data/guardianAuth";
import { GuardianRevokeForm } from "@/features/consents/ui/GuardianRevokeForm";
import { revokeBoxCodes } from "@/features/consents/domain/guardianAuth";
import { CONSENT_BOXES } from "@/features/consents/domain/boxes";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function GuardianRevokePage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();
  const found = await loadGuardianLink(token, "REVOKE");
  if (!found) notFound();

  if (found.stale === "used") {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.auth}>
            <h1>{it.guardianRevokeTitle}</h1>
            <p>{it.guardianRevokeDone}</p>
          </section>
        </main>
      </PublicShell>
    );
  }
  if (found.stale) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.auth}>
            <h1>{it.guardianRevokeTitle}</h1>
            <p>{it.errorCONSENT_TOKEN_INVALID}</p>
          </section>
        </main>
      </PublicShell>
    );
  }

  const partnersPublished = await isPartnerBoxVisible();
  const boxes = CONSENT_BOXES.filter((box) => revokeBoxCodes(partnersPublished).includes(box.code));
  const playerName = `${found.registration.playerProfile.firstName} ${found.registration.playerProfile.lastName}`.trim();

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <GuardianRevokeForm token={token} playerName={playerName} boxes={boxes} />
        </section>
      </main>
    </PublicShell>
  );
}
