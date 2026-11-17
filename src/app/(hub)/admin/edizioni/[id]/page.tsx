import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditionAdmin } from "@/features/admin/data/catalog";
import { listEditionTeamsAdmin } from "@/features/admin/data/edition-teams";
import { listLeagueSupervisorEditions, listLeagueSupervisorsForEdition } from "@/features/league/data/accounts";
import { SupervisorInviteForm } from "@/features/league/ui/SupervisorInviteForm";
import { SupervisorStatusForm } from "@/features/league/ui/SupervisorStatusForm";
import { StatusChip } from "@/shared/ui/StatusChip";
import { decimalText, toDatetimeLocalValue } from "@/features/admin/domain/format";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { isSuperAdmin } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { EditionDeleteForm, EditionForm } from "@/features/admin/ui/EditionForm";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditionDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ actor }, edition, teams, supervisors, editions] = await Promise.all([
    requireStaff(`/admin/edizioni/${id}`),
    getEditionAdmin(id),
    listEditionTeamsAdmin(id),
    listLeagueSupervisorsForEdition(id),
    listLeagueSupervisorEditions(),
  ]);
  if (!edition) notFound();

  return (
    <AdminFrame path={`/admin/edizioni/${id}`} actor={actor}>
      <PageHeader
        kicker={edition.competition.name}
        title={edition.name}
        description={`${it.adminTeamsCount}: ${edition._count.teams} · ${it.adminRegistrationsCount}: ${edition._count.registrations}`}
        aside={
          <>
            {isSuperAdmin(actor) ? (
              <ButtonLink href={`/admin/edizioni/${id}/quote`} variant="secondary">
                {it.adminFeesLink}
              </ButtonLink>
            ) : null}
            {isSuperAdmin(actor) ? (
              <ButtonLink href={`/admin/pagamenti/bonifico?editionId=${id}`} variant="secondary">
                {it.adminBankLink}
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/admin/edizioni/${id}/export`} variant="secondary" icon="download">
              {it.adminEditionTeamsExport}
            </ButtonLink>
          </>
        }
      />
      {edition._count.registrations > 0 ? <p className={styles.meta}>{it.adminEditionHasRegistrations}</p> : null}
      <EditionForm
        mode="edit"
        canManageFees={isSuperAdmin(actor)}
        edition={{
          id: edition.id,
          name: edition.name,
          year: edition.year,
          paymentMode: edition.paymentMode,
          medicalCertificateKind: edition.medicalCertificateKind,
          playerFeeAmount: decimalText(edition.playerFeeAmount),
          staffFeeAmount: decimalText(edition.staffFeeAmount),
          teamFeeAmount: decimalText(edition.teamFeeAmount),
          isActive: edition.isActive,
          registrationOpensAt: toDatetimeLocalValue(edition.registrationOpensAt),
          registrationClosesAt: toDatetimeLocalValue(edition.registrationClosesAt),
          competitionName: edition.competition.name,
          requirements: edition.requirements,
        }}
      />

      <section>
        <h2 className={styles.sectionTitle}>{it.adminEditionTeams}</h2>
        <p className={styles.meta}>{it.adminEditionTeamsHelp}</p>
        {teams.length === 0 ? (
          <p className={styles.empty}>{it.adminEditionTeamsEmpty}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{it.adminSchool}</th>
                  <th>{it.adminCity}</th>
                  <th>{it.adminTeam}</th>
                  <th>{it.adminRepresentative}</th>
                  <th className={styles.num}>{it.adminAccountsStarted}</th>
                  <th className={styles.num}>{it.adminRegistrationsCompleted}</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.schoolName}</td>
                    <td>{team.schoolCity || "—"}</td>
                    <td>
                      <Link href={`/admin/squadre/${team.id}`}>{team.teamName}</Link>
                    </td>
                    <td>
                      {team.representativeName || team.representativeEmail ? (
                        <>
                          {team.representativeName || it.adminNoRepresentative}
                          {team.representativeEmail ? (
                            <span className={styles.meta}>{team.representativeEmail}</span>
                          ) : null}
                        </>
                      ) : (
                        it.adminNoRepresentative
                      )}
                    </td>
                    <td className={styles.num}>{team.accountsStarted}</td>
                    <td className={styles.num}>{team.registrationsCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>{it.adminSupervisorsTitle}</h2>
        <p className={styles.meta}>{it.adminSupervisorsHelp}</p>
        {supervisors.length === 0 ? (
          <p className={styles.empty}>{it.adminSupervisorsEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {supervisors.map((row) => (
              <li key={row.id} className={styles.item}>
                <span>
                  <strong>{row.user.name ?? row.user.email}</strong>
                  <span className={styles.meta}>
                    {row.user.email}
                    {!row.activatedAt && !row.user.passwordHash ? ` · ${it.adminSupervisorPending}` : ""}
                  </span>
                </span>
                <StatusChip tone={row.status === "ACTIVE" ? "complete" : "danger"}>
                  {row.status === "ACTIVE" ? it.adminSupervisorActive : it.adminSupervisorSuspended}
                </StatusChip>
                <SupervisorStatusForm
                  id={row.id}
                  status={row.status}
                  canResend={row.status === "ACTIVE" && !row.activatedAt && !row.user.passwordHash}
                />
              </li>
            ))}
          </ul>
        )}
        <div className={styles.sideCard}>
          <h3 className={styles.sectionTitle}>{it.adminSupervisorInvite}</h3>
          <SupervisorInviteForm
            editionId={id}
            editions={editions.map((row) => ({
              id: row.id,
              label: `${row.competition.name} · ${row.name}`,
            }))}
          />
        </div>
      </section>

      <EditionDeleteForm editionId={edition.id} registrationCount={edition._count.registrations} />
    </AdminFrame>
  );
}
