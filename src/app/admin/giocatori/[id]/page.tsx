import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerAdmin } from "@/features/admin/data/catalog";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { AccountLifecycleForm } from "@/features/admin/ui/AccountLifecycleForm";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

const STATUS_COPY: Record<string, string> = {
  INVITED: it.statusINVITED,
  ACCOUNT_CREATED: it.statusACCOUNT_CREATED,
  IN_PROGRESS: it.statusIN_PROGRESS,
  PENDING_REVIEW: it.statusPENDING_REVIEW,
  CHANGES_REQUESTED: it.statusCHANGES_REQUESTED,
  PAYMENT_PENDING: it.statusPAYMENT_PENDING,
  APPROVED: it.statusAPPROVED,
  WITHDRAWN: it.statusWITHDRAWN,
  REMOVED: it.statusREMOVED,
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminPlayerPage({ params }: Props) {
  const { actor } = await requireStaff(`/admin/giocatori`);
  const { id } = await params;
  const profile = await getPlayerAdmin(id);
  if (!profile) notFound();
  const registration = profile.registrations[0];
  const workspace = await loadPlayerWorkspace(profile.user.id);
  const document = registration?.documents[0];

  return (
    <AdminFrame path={`/admin/giocatori/${id}`}>
      <PageHeader
        kicker={it.adminPlayer}
        title={`${profile.firstName} ${profile.lastName}`}
        aside={
          registration ? (
            <StatusChip tone={registration.status === "APPROVED" ? "complete" : "attention"}>
              {STATUS_COPY[registration.status] ?? registration.status}
            </StatusChip>
          ) : null
        }
      />
      <p className={styles.meta}>
        {it.email}: {profile.user.email}
      </p>
      <p className={styles.meta}>
        {it.fiscalCode}: {profile.fiscalCode ?? "—"}
      </p>
      <p className={styles.meta}>
        {it.phone}: {profile.phone ?? "—"}
      </p>
      {profile.guardians[0] ? (
        <p className={styles.meta}>
          {it.guardianTitle}: {profile.guardians[0].firstName} {profile.guardians[0].lastName} · {profile.guardians[0].email}
        </p>
      ) : null}
      {registration ? (
        <p className={styles.meta}>
          {registration.team.edition.competition.name} · {registration.team.name}
        </p>
      ) : null}
      {workspace ? (
        <ul className={styles.list}>
          {workspace.checklist
            .filter((item) => item.status !== "not_applicable")
            .map((item) => (
              <li key={item.code} className={styles.item}>
                <strong>{item.code}</strong>
                <StatusChip tone={item.status === "complete" ? "complete" : item.status === "attention" ? "attention" : "todo"}>
                  {item.status}
                </StatusChip>
              </li>
            ))}
        </ul>
      ) : null}
      {registration?.consentRecords.length ? (
        <section>
          <h2 className={styles.sectionTitle}>{it.consentVersion}</h2>
          <ul className={styles.list}>
            {registration.consentRecords.map((record) => (
              <li key={record.id} className={styles.item}>
                <span>
                  <strong>{record.legalDocumentVersion.legalDocument.title}</strong>
                  <span className={styles.meta}>
                    {record.legalDocumentVersion.version} · {record.acceptedAt.toLocaleString("it-IT")} ·{" "}
                    {record.accepted ? it.consentMediaAccept : it.consentMediaRefuse}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {document ? (
        <p>
          <Link href={`/admin/documenti/${document.id}`}>{it.adminDocumentTitle}</Link>
          {" · "}
          <OpenDocumentButton documentId={document.id} />
        </p>
      ) : null}
      {registration && registration.status !== "WITHDRAWN" && registration.status !== "REMOVED" ? (
        <WithdrawForm registrationId={registration.id} />
      ) : null}
      {authorize(actor, "platform:admin").allow ? (
        <p>
          <Link href={`/admin/utenti/${profile.user.id}`}>{it.lifecycleUsersTitle}</Link>
        </p>
      ) : null}
      <AccountLifecycleForm
        userId={profile.user.id}
        email={profile.user.email}
        lifecycleStatus={profile.user.lifecycleStatus}
        canDelete={authorize(actor, "user:delete", { ownerUserId: profile.user.id }).allow}
        canAnonymize={authorize(actor, "user:anonymize", { ownerUserId: profile.user.id }).allow}
      />
    </AdminFrame>
  );
}
