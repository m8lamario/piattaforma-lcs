import { notFound } from "next/navigation";
import { loadGuardianLink } from "@/features/consents/data/guardianAuth";
import { openGuardianLinkAction } from "@/features/consents/guardianActions";
import { GuardianAuthorizeForm } from "@/features/consents/ui/GuardianAuthorizeForm";
import { enrollmentBoxCodes, publicationBoxCodes } from "@/features/consents/domain/guardianAuth";
import { CONSENT_BOXES } from "@/features/consents/domain/boxes";
import { getCurrentLegalVersions } from "@/features/consents/data/legal";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { MEDIA_RELEASE_SLUG, privacySlugsFor } from "@/features/consents/domain/pack";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../../accedi/page.module.css";

type Props = { params: Promise<{ token: string }> };

export default async function GuardianAuthorizePage({ params }: Props) {
  const { token } = await params;
  if (!isWellFormedInviteToken(token)) notFound();
  const found = await loadGuardianLink(token, "AUTHORIZE");
  const publication = found ? null : await loadGuardianLink(token, "PUBLICATION");
  const row = found ?? publication;
  if (!row) notFound();

  if (row.stale === "used") {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.auth}>
            <h1>{it.guardianLinkTitle}</h1>
            <p>{it.guardianLinkDone}</p>
          </section>
        </main>
      </PublicShell>
    );
  }
  if (row.stale) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.auth}>
            <h1>{it.guardianLinkTitle}</h1>
            <p>{it.errorCONSENT_TOKEN_INVALID}</p>
          </section>
        </main>
      </PublicShell>
    );
  }

  const purpose = found ? "AUTHORIZE" : "PUBLICATION";
  await openGuardianLinkAction(token, purpose);
  const partnersPublished = await isPartnerBoxVisible();
  const codes = purpose === "PUBLICATION" ? publicationBoxCodes(partnersPublished) : enrollmentBoxCodes(partnersPublished);
  const boxes = CONSENT_BOXES.filter((box) => codes.includes(box.code));
  const slugs = purpose === "PUBLICATION" ? [MEDIA_RELEASE_SLUG] : [...privacySlugsFor(true), MEDIA_RELEASE_SLUG];
  const versions = await getCurrentLegalVersions(slugs);
  const documents = versions.map((version) => ({
    slug: version.legalDocument.slug,
    title: version.legalDocument.title,
    version: version.version,
    versionId: version.id,
    body: version.body,
  }));
  const playerName = `${row.registration.playerProfile.firstName} ${row.registration.playerProfile.lastName}`.trim();
  const tournamentName = `${row.registration.team.edition.competition.name} — ${row.registration.team.edition.name}`;

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.auth}>
          <GuardianAuthorizeForm
            token={token}
            purpose={purpose}
            playerName={playerName}
            tournamentName={tournamentName}
            documents={documents}
            boxes={boxes}
          />
        </section>
      </main>
    </PublicShell>
  );
}
