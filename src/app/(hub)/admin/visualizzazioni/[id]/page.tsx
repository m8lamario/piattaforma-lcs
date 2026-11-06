import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminView } from "@/features/admin-view/data/sessions";
import { personLabel, sessionDurationSeconds } from "@/features/admin-view/domain/policy";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import { PageHeader } from "@/shared/ui/PageHeader";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

function formatWhen(value: Date) {
  return value.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest} s`;
  return `${minutes} min ${rest} s`;
}

function metadataText(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const row = value as Record<string, unknown>;
  const model = typeof row.model === "string" ? row.model : "";
  const operation = typeof row.operation === "string" ? row.operation : "";
  if (!model && !operation) return "";
  return `${model} ${operation}`.trim();
}

export default async function AdminViewDetailPage({ params }: Props) {
  const [{ actor }, { id }] = await Promise.all([requireStaff("/admin/visualizzazioni"), params]);
  if (!authorize(actor, "user:view_as").allow) redirect("/admin");
  const { session, events } = await getAdminView(id);
  if (!session) notFound();

  const active = session.endedAt === null;
  const target = personLabel({
    email: session.target.email,
    name: session.target.name,
    firstName: session.target.playerProfile?.firstName,
    lastName: session.target.playerProfile?.lastName,
  });
  const blocked = events.filter((event) => event.action === "VIEW_WRITE_BLOCKED");
  const documents = events.filter((event) => event.action === "DOCUMENT_VIEW" || event.action === "MEDIA_VERIFY");

  return (
    <AdminFrame path="/admin/visualizzazioni" actor={actor}>
      <PageHeader
        kicker={it.adminViewHistoryTitle}
        title={target}
        description={`${it.adminViewAdmin}: ${session.admin.email}`}
      />
      <p>
        <Link href="/admin/visualizzazioni">{it.adminViewBack}</Link>
      </p>
      <ul className={styles.list}>
        <li className={styles.item}>
          <span>
            <strong>{it.adminViewWhen}</strong>
            <span className={styles.meta}>
              {formatWhen(session.startedAt)}
              {session.endedAt ? ` – ${formatWhen(session.endedAt)}` : ""} · {it.adminViewDuration}{" "}
              {formatDuration(sessionDurationSeconds(session.startedAt, active ? null : session.endedAt))} ·{" "}
              {session.mode}
              {session.endReason ? ` · ${session.endReason}` : active ? ` · ${it.adminViewReasonACTIVE}` : ""}
            </span>
          </span>
        </li>
      </ul>
      <h2 className={styles.sectionTitle}>{it.adminViewBlockedTitle}</h2>
      {blocked.length === 0 ? (
        <p className={styles.empty}>{it.adminViewNoBlocked}</p>
      ) : (
        <ul className={styles.list}>
          {blocked.map((event) => (
            <li key={event.id} className={styles.item}>
              <span>
                <strong>{formatWhen(event.createdAt)}</strong>
                <span className={styles.meta}>{metadataText(event.metadata)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <h2 className={styles.sectionTitle}>{it.adminViewDocumentsTitle}</h2>
      {documents.length === 0 ? (
        <p className={styles.empty}>{it.adminViewNoDocuments}</p>
      ) : (
        <ul className={styles.list}>
          {documents.map((event) => (
            <li key={event.id} className={styles.item}>
              <span>
                <strong>{event.action}</strong>
                <span className={styles.meta}>
                  {formatWhen(event.createdAt)} · {event.entityType} {event.entityId}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
