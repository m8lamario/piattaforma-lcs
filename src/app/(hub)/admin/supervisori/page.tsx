import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireAction } from "@/shared/authz/requireStaff";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import { listLeagueSupervisorEditions, listLeagueSupervisors } from "@/features/league/data/accounts";
import { SupervisorInviteForm } from "@/features/league/ui/SupervisorInviteForm";
import { SupervisorStatusForm } from "@/features/league/ui/SupervisorStatusForm";
import { SupervisorEditionForm } from "@/features/league/ui/SupervisorEditionForm";

function editionLabel(edition: { name: string; competition: { name: string } }) {
  return `${edition.competition.name} · ${edition.name}`;
}

export default async function AdminSupervisorsPage() {
  const { actor } = await requireAction("/admin/supervisori", "league:manage");
  const [rows, editions] = await Promise.all([listLeagueSupervisors(), listLeagueSupervisorEditions()]);
  const options = editions.map((edition) => ({ id: edition.id, label: editionLabel(edition) }));

  return (
    <AdminFrame path="/admin/supervisori" actor={actor}>
      <PageHeader title={it.adminSupervisorsTitle} description={it.adminSupervisorsHelp} />
      <div className={styles.twoColGrid}>
        <section className={styles.colMain}>
          {rows.length === 0 ? (
            <p className={styles.empty}>{it.adminSupervisorsEmpty}</p>
          ) : (
            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.id} className={styles.item}>
                  <span>
                    <strong>{row.user.name ?? row.user.email}</strong>
                    <span className={styles.meta}>
                      {row.user.email} · {editionLabel(row.edition)}
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
                  <SupervisorEditionForm id={row.id} editionId={row.editionId} editions={options} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.adminSupervisorInvite}</h2>
            <SupervisorInviteForm editions={options} />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
