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

      <div className={styles.twoColGrid}>
        {/* Main Column: Anagrafica, Checklist, Consents */}
        <section className={styles.colMain}>
          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.fieldGroupIdentity}</h2>
            <p className={styles.meta}>
              {it.email}: <strong>{profile.user.email}</strong>
            </p>
            <p className={styles.meta}>
              {it.fiscalCode}: <strong>{profile.fiscalCode ?? "—"}</strong>
            </p>
            <p className={styles.meta}>
              {it.phone}: <strong>{profile.phone ?? "—"}</strong>
            </p>
            {profile.guardians[0] ? (
              <p className={styles.meta}>
                {it.guardianTitle}: <strong>{profile.guardians[0].firstName} {profile.guardians[0].lastName}</strong> · {profile.guardians[0].email}
              </p>
            ) : null}
            {registration ? (
              <p className={styles.meta}>
                {it.teamTitle}: <strong>{registration.team.edition.competition.name} · {registration.team.name}</strong>
              </p>
            ) : null}
          </div>

          {workspace ? (
            <div>
              <h2 className={styles.sectionTitle}>{it.checklistTitle}</h2>
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
            </div>
          ) : null}

          {registration?.consentRecords.length ? (
            <div>
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
            </div>
          ) : null}
        </section>

        {/* Side Column: Document review, Registration withdraw, Account lifecycle */}
        <aside className={styles.colSide}>
          {document ? (
            <div className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>{it.adminDocumentTitle}</h2>
              <p className={styles.meta}>
                {it.adminStatus}: <StatusChip tone={document.status === "APPROVED" ? "complete" : "attention"}>{document.status}</StatusChip>
              </p>
              <p className={styles.meta}>{document.originalFilename}</p>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
                <Link href={`/admin/documenti/${document.id}`} className={styles.item} style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--color-hairline)" }}>
                  <strong>{it.navAdminDocuments}</strong>
                </Link>
                <OpenDocumentButton documentId={document.id} />
              </div>
            </div>
          ) : null}

          {registration && registration.status !== "WITHDRAWN" && registration.status !== "REMOVED" ? (
            <div className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>{it.withdraw}</h2>
              <WithdrawForm registrationId={registration.id} />
            </div>
          ) : null}

          <div className={styles.sideCard}>
            <h2 className={styles.sectionTitle}>{it.lifecycleUsersTitle}</h2>
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
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
