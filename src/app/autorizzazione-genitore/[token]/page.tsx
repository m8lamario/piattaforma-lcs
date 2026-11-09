import { notFound } from "next/navigation";
import { loadGuardianLink } from "@/features/consents/data/guardianAuth";
import { openGuardianLinkAction } from "@/features/consents/guardianActions";
import { GuardianAuthorizeForm } from "@/features/consents/ui/GuardianAuthorizeForm";
import {
  enrollmentBoxCodes,
  isSubmittedAuthorizationStatus,
  latestGuardianDecisions,
  publicationBoxCodes,
} from "@/features/consents/domain/guardianAuth";
import { CONSENT_BOXES } from "@/features/consents/domain/boxes";
import { getCurrentLegalVersions } from "@/features/consents/data/legal";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { MEDIA_RELEASE_SLUG, privacySlugsFor } from "@/features/consents/domain/pack";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "./page.module.css";

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
          <section className={styles.statusCard}>
            <h1 className={styles.title}>{it.guardianLinkTitle}</h1>
            <p className={styles.lead}>{it.guardianLinkDone}</p>
          </section>
        </main>
      </PublicShell>
    );
  }
  if (row.stale) {
    return (
      <PublicShell>
        <main className={styles.main}>
          <section className={styles.statusCard}>
            <h1 className={styles.title}>{it.guardianLinkTitle}</h1>
            <p className={styles.lead}>{it.errorCONSENT_TOKEN_INVALID}</p>
          </section>
        </main>
      </PublicShell>
    );
  }

  const purpose = found ? "AUTHORIZE" : "PUBLICATION";
  await openGuardianLinkAction(token, purpose);
  const partnersPublished = await isPartnerBoxVisible();
  const codes =
    purpose === "PUBLICATION"
      ? publicationBoxCodes(partnersPublished)
      : enrollmentBoxCodes(partnersPublished, row.registration.category);
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
  const latest = latestGuardianDecisions(row.authorization?.decisions ?? []);
  const currentChoices = [...latest.values()].map((choice) => ({
    code: choice.code,
    accepted: choice.accepted,
    value: choice.value,
  }));
  const submittedStatus = isSubmittedAuthorizationStatus(row.authorization?.status ?? "")
    ? (row.authorization?.status as "AUTHORIZED" | "REFUSED")
    : null;
  const g3Raw = latest.get("G3")?.value;
  const currentG3 = g3Raw === "OTHER_PARENT" || g3Raw === "SOLE" ? g3Raw : "";

  return (
    <PublicShell>
      <main className={styles.main}>
        <div className={styles.container}>
          <GuardianAuthorizeForm
            token={token}
            purpose={purpose}
            playerName={playerName}
            tournamentName={tournamentName}
            documents={documents}
            boxes={boxes}
            currentChoices={currentChoices}
            currentG3={currentG3}
            submittedStatus={submittedStatus}
          />
        </div>
      </main>
    </PublicShell>
  );
}
