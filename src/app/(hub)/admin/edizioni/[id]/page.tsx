import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditionAdmin } from "@/features/admin/data/catalog";
import { listEditionTeamsAdmin } from "@/features/admin/data/edition-teams";
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
  const [{ actor }, edition, teams] = await Promise.all([
    requireStaff(`/admin/edizioni/${id}`),
    getEditionAdmin(id),
    listEditionTeamsAdmin(id),
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

      <EditionDeleteForm editionId={edition.id} registrationCount={edition._count.registrations} />
    </AdminFrame>
  );
}
