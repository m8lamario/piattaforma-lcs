import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSchoolLifecycleSnapshot } from "@/features/admin/data/schoolLifecycle";
import { schoolDeleteBlockers } from "@/features/admin/domain/schoolLifecycle";
import { SchoolLifecycleForm } from "@/features/admin/ui/SchoolLifecycleForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaff } from "@/shared/authz/requireStaff";
import { authorize } from "@/shared/authz/authorize";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
};

export default async function AdminSchoolDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { actor } = await requireStaff(`/admin/scuole/${id}`);
  const snapshot = await loadSchoolLifecycleSnapshot(id, actor.userId);
  if (!snapshot.school) notFound();
  const shared = snapshot.users.filter((user) => user.otherSchool || user.platformRole).length;
  const summary = it.schoolLifecycleSummary
    .replace("{users}", String(snapshot.users.length))
    .replace("{players}", String(snapshot.playerCount))
    .replace("{staff}", String(snapshot.staffCount))
    .replace("{registrations}", String(snapshot.registrationIds.length))
    .replace("{documents}", String(snapshot.documentIds.length))
    .replace("{payments}", String(snapshot.paymentCount))
    .replace("{transfers}", String(snapshot.bankTransferCount));

  return (
    <AdminFrame path={`/admin/scuole/${id}`} actor={actor}>
      <PageHeader
        title={snapshot.school.name}
        description={`${snapshot.teamIds.length} squadre · ${snapshot.representativeCount} referenze`}
      />
      {query.done === "anonymized" ? <p role="status">{it.schoolLifecycleDoneAnonymized}</p> : null}
      <p>
        <Link href="/admin/scuole" className={styles.sectionTitle}>
          {it.schoolListTitle}
        </Link>
      </p>
      <SchoolLifecycleForm
        schoolId={snapshot.school.id}
        schoolName={snapshot.school.name}
        summary={summary}
        sharedNote={shared > 0 ? it.schoolLifecycleShared.replace("{count}", String(shared)) : null}
        anonymized={snapshot.school.anonymized}
        deleteBlocked={schoolDeleteBlockers(snapshot).length > 0}
        canDelete={authorize(actor, "user:delete").allow}
        canAnonymize={authorize(actor, "user:anonymize").allow}
      />
    </AdminFrame>
  );
}
