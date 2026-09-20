import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUserAdmin } from "@/features/admin/data/lifecycle";
import { lifecycleStatusLabel } from "@/features/admin/domain/lifecycle";
import { AccountLifecycleForm } from "@/features/admin/ui/AccountLifecycleForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> };

export default async function AdminUserDetailPage({ params, searchParams }: Props) {
  const { actor } = await requireStaff("/admin/utenti");
  if (!authorize(actor, "platform:admin").allow) redirect("/admin");
  const { id } = await params;
  const user = await getUserAdmin(id);
  if (!user) notFound();
  const query = await searchParams;
  const canDelete = authorize(actor, "user:delete", { ownerUserId: user.id }).allow;
  const canAnonymize = authorize(actor, "user:anonymize", { ownerUserId: user.id }).allow;

  return (
    <AdminFrame path={`/admin/utenti/${id}`}>
      <PageHeader
        kicker={it.lifecycleUsersTitle}
        title={user.name ?? user.email}
        aside={
          <StatusChip tone={user.lifecycleStatus === "ACTIVE" ? "complete" : "danger"}>
            {lifecycleStatusLabel(user.lifecycleStatus)}
          </StatusChip>
        }
      />
      {query.done === "anonymized" ? (
        <p className={fields.bannerOk} role="status">
          {it.lifecycleAnonymizedDone}
        </p>
      ) : null}

      <div className={styles.twoColGrid}>
        {/* Left: User info and memberships */}
        <section className={styles.colMain}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.fieldGroupIdentity}</h2>
            <p className={styles.meta}>
              {it.email}: <strong>{user.email}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminStatus}: <strong>{user.roles.map((role) => role.role).join(", ") || "—"}</strong>
            </p>
            {user.playerProfile ? (
              <p style={{ marginTop: "var(--space-2)" }}>
                <Link href={`/admin/giocatori/${user.playerProfile.id}`} className={styles.item} style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-hairline)" }}>
                  <strong>{it.adminPlayer}</strong>
                </Link>
              </p>
            ) : null}
          </div>

          {user.teamMemberships.length > 0 ? (
            <div>
              <h2 className={styles.sectionTitle}>{it.navAdminTeams}</h2>
              <ul className={styles.list}>
                {user.teamMemberships.map((row) => (
                  <li key={row.id} className={styles.item}>
                    <span>
                      <strong>{row.team.name}</strong>
                      <span className={styles.meta}>{row.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Right: Lifecycle management actions */}
        <aside className={styles.colSide}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.lifecycleUsersTitle}</h2>
            <AccountLifecycleForm
              userId={user.id}
              email={user.email}
              lifecycleStatus={user.lifecycleStatus}
              canDelete={canDelete}
              canAnonymize={canAnonymize}
            />
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
