import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { requireLeagueSupervisor } from "@/shared/authz/requireStaff";
import { getLeaguePlayer } from "@/features/league/data/overview";
import { LeagueFrame } from "@/features/league/ui/LeagueFrame";
import {
  leagueCompletedAtLabel,
  leagueMedicalLabel,
  leaguePaymentLabel,
  leagueRegistrationLabel,
} from "@/features/league/domain/copy";
import { it } from "@/shared/i18n/it";
import styles from "@/features/league/ui/league.module.css";

type Props = { params: Promise<{ registrationId: string }> };

export default async function LeaguePlayerDetailPage({ params }: Props) {
  const { registrationId } = await params;
  const { editionId, session } = await requireLeagueSupervisor(`/lega/giocatori/${registrationId}`);
  const result = await getLeaguePlayer(editionId, registrationId, session.user.id);
  if (!result) notFound();
  const { player } = result;

  return (
    <LeagueFrame>
      <PageHeader
        kicker={result.edition ? `${result.edition.competition.name} · ${result.edition.name}` : it.navLeaguePlayers}
        title={`${player.firstName} ${player.lastName}`}
        description={it.leaguePlayerDetailHelp}
      />
      <section className={styles.detail}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{it.leagueSchoolName}</span>
          <Link href={`/lega/scuole/${player.schoolId}`}>{player.schoolName}</Link>
        </div>
        {player.teamCountInSchool > 1 ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{it.leagueTeamName}</span>
            <span>{player.teamName}</span>
          </div>
        ) : null}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{it.leagueFilterStatus}</span>
          <StatusChip tone={player.registrationStatus === "APPROVED" ? "complete" : "attention"}>
            {leagueRegistrationLabel(player.registrationStatus)}
          </StatusChip>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{it.leagueFilterMedical}</span>
          <StatusChip tone={player.medicalStatus === "approved" ? "complete" : "attention"}>
            {leagueMedicalLabel(player.medicalStatus)}
          </StatusChip>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{it.leagueFilterPayment}</span>
          <StatusChip tone={player.paymentStatus === "paid" ? "complete" : "attention"}>
            {leaguePaymentLabel(player.paymentStatus)}
          </StatusChip>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{it.leagueCompletedAt}</span>
          <span>{leagueCompletedAtLabel(player.completedAt)}</span>
        </div>
      </section>
    </LeagueFrame>
  );
}
