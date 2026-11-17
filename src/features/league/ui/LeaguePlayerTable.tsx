import Link from "next/link";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import type { LeagueMedicalStatus, LeaguePlayerRecord, LeaguePaymentStatus } from "@/features/league/domain/status";
import {
  leagueCompletedAtLabel,
  leagueMedicalLabel,
  leaguePaymentLabel,
  leagueRegistrationLabel,
} from "@/features/league/domain/copy";
import styles from "./league.module.css";

function medicalTone(status: LeagueMedicalStatus) {
  if (status === "approved") return "complete" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "pending") return "attention" as const;
  return "todo" as const;
}

function paymentTone(status: LeaguePaymentStatus) {
  if (status === "paid") return "complete" as const;
  if (status === "pending") return "attention" as const;
  return "neutral" as const;
}

function registrationTone(status: string) {
  if (status === "APPROVED") return "complete" as const;
  if (status === "CHANGES_REQUESTED" || status === "WITHDRAWN") return "danger" as const;
  if (status === "PAYMENT_PENDING" || status === "PENDING_REVIEW") return "attention" as const;
  return "todo" as const;
}

export function LeaguePlayerTable({
  players,
  showSchool = true,
}: {
  players: LeaguePlayerRecord[];
  showSchool?: boolean;
}) {
  return (
    <>
      <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{it.firstName}</th>
              {showSchool ? <th>{it.leagueSchoolName}</th> : null}
              <th>{it.leagueFilterStatus}</th>
              <th>{it.leagueFilterMedical}</th>
              <th>{it.leagueFilterPayment}</th>
              <th>{it.leagueCompletedAt}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.registrationId}>
                <td>
                  <Link href={`/lega/giocatori/${player.registrationId}`}>
                    {player.lastName} {player.firstName}
                  </Link>
                </td>
                {showSchool ? (
                  <td>
                    {player.schoolName}
                    {player.teamCountInSchool > 1 ? (
                      <span className={styles.cardMeta}> · {player.teamName}</span>
                    ) : null}
                  </td>
                ) : null}
                <td>
                  <StatusChip tone={registrationTone(player.registrationStatus)}>
                    {leagueRegistrationLabel(player.registrationStatus)}
                  </StatusChip>
                </td>
                <td>
                  <StatusChip tone={medicalTone(player.medicalStatus)}>
                    {leagueMedicalLabel(player.medicalStatus)}
                  </StatusChip>
                </td>
                <td>
                  <StatusChip tone={paymentTone(player.paymentStatus)}>
                    {leaguePaymentLabel(player.paymentStatus)}
                  </StatusChip>
                </td>
                <td>{leagueCompletedAtLabel(player.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${styles.cards} ${styles.mobileOnly}`}>
        {players.map((player) => (
          <Link key={player.registrationId} href={`/lega/giocatori/${player.registrationId}`} className={styles.card}>
            <div className={styles.cardHead}>
              <strong>
                {player.lastName} {player.firstName}
              </strong>
              <StatusChip tone={registrationTone(player.registrationStatus)}>
                {leagueRegistrationLabel(player.registrationStatus)}
              </StatusChip>
            </div>
            {showSchool ? <p className={styles.cardMeta}>{player.schoolName}</p> : null}
            <div className={styles.counts}>
              <StatusChip tone={medicalTone(player.medicalStatus)}>{leagueMedicalLabel(player.medicalStatus)}</StatusChip>
              <StatusChip tone={paymentTone(player.paymentStatus)}>{leaguePaymentLabel(player.paymentStatus)}</StatusChip>
              <span className={styles.cardMeta}>{leagueCompletedAtLabel(player.completedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
