import { notFound } from "next/navigation";
import { getTeamAdmin } from "@/features/admin/data/catalog";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { StaffInviteForm } from "@/features/admin/ui/StaffInviteForm";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTeamDetailPage({ params }: Props) {
  const { id } = await params;
  const team = await getTeamAdmin(id);
  if (!team) notFound();
  return (
    <AdminFrame path={`/admin/squadre/${id}`}>
      <PageHeader
        kicker={`${team.edition.competition.name} · ${team.edition.name}`}
        title={team.name}
        description={`${team.school.name}${team.school.city ? ` · ${team.school.city}` : ""}`}
      />
      <p className={styles.meta}>
        {it.adminRepresentative}: {team.representative?.email ?? it.adminNoRepresentative}
      </p>
      <StaffInviteForm teamId={team.id} />
      {team.staffInvites.length > 0 ? (
        <ul className={styles.list}>
          {team.staffInvites.map((invite) => (
            <li key={invite.id} className={styles.item}>
              <span>
                <strong>{invite.email}</strong>
                <span className={styles.meta}>{invite.createdAt.toISOString().slice(0, 10)}</span>
              </span>
              <StatusChip tone={invite.status === "ACCEPTED" ? "complete" : "attention"}>{invite.status}</StatusChip>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminFrame>
  );
}
