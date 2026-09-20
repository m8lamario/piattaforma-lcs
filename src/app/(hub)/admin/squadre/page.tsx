import Link from "next/link";
import { filterOptions, listTeamsAdmin } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { TeamCreateForm } from "@/features/admin/ui/TeamCreateForm";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

export default async function AdminTeamsPage() {
  const [teams, options] = await Promise.all([listTeamsAdmin(), filterOptions()]);
  return (
    <AdminFrame path="/admin/squadre">
      <PageHeader title={it.navAdminTeams} description={it.adminTeamsHelp} />
      <div className={styles.twoColGrid}>
        <section className={styles.colMain}>
          <h2 className={styles.sectionTitle}>{it.adminTeamsCount}</h2>
          <ul className={styles.list}>
            {teams.map((team) => (
              <li key={team.id}>
                <Link href={`/admin/squadre/${team.id}`} className={styles.item}>
                  <span>
                    <strong>{team.name}</strong>
                    <span className={styles.meta}>
                      {team.edition.competition.name} · {team.school.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.adminCreateTeam}</h2>
            <TeamCreateForm
              editions={options.editions.map((edition) => ({
                id: edition.id,
                label: `${edition.competition.name} · ${edition.name}`,
              }))}
            />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
