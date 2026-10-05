import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmailMessage } from "@/features/emails/data/catalog";
import { canRetryEmail } from "@/features/emails/domain/status";
import { EmailRetryForm } from "@/features/emails/ui/EmailRetryForm";
import { emailPurposeLabel, emailStatusLabel, emailStatusTone, formatEmailWhen } from "@/features/emails/ui/labels";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { writeAuditLog } from "@/shared/lib/audit";
import { requireStaff } from "@/shared/authz/requireStaff";
import { authorize } from "@/shared/authz/authorize";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEmailDetailPage({ params }: Props) {
  const { id } = await params;
  const { session, actor } = await requireStaff(`/admin/comunicazioni/${id}`);
  if (!authorize(actor, "email:read").allow) notFound();
  const message = await getEmailMessage(id);
  if (!message) notFound();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EMAIL_VIEW",
    entityType: "EmailMessage",
    entityId: message.id,
  });
  const retryable = canRetryEmail(message);

  return (
    <AdminFrame path={`/admin/comunicazioni/${id}`}>
      <p>
        <Link href="/admin/comunicazioni">{it.adminEmailBack}</Link>
      </p>
      <PageHeader title={message.subject} description={emailPurposeLabel(message.purpose)} />
      <StatusChip tone={emailStatusTone(message.status)}>{emailStatusLabel(message.status)}</StatusChip>
      <dl className={styles.checks}>
        <div className={styles.check}>
          <strong>{it.adminEmailRecipient}</strong>
          <span>
            {message.toAddress}
            {message.recipientKind === "GUARDIAN" ? ` (${it.emailKindGUARDIAN})` : ""}
          </span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailFrom}</strong>
          <span>
            {message.fromAddress}
            {message.replyTo ? ` · ${it.adminEmailsReplyTo}: ${message.replyTo}` : ""}
          </span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailTemplate}</strong>
          <span>{message.templateKey}</span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailLinkedUser}</strong>
          <span>{message.user?.email ?? "—"}</span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailProviderId}</strong>
          <span>{message.providerMessageId ?? "—"}</span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailSentAt}</strong>
          <span>{formatEmailWhen(message.sentAt ?? message.queuedAt)}</span>
        </div>
        <div className={styles.check}>
          <strong>{it.adminEmailUpdatedAt}</strong>
          <span>{formatEmailWhen(message.lastEventAt)}</span>
        </div>
        {message.sourceEntityType ? (
          <div className={styles.check}>
            <strong>{it.adminEmailSource}</strong>
            <span>
              {message.sourceEntityType}
              {message.sourceEntityId ? ` · ${message.sourceEntityId}` : ""}
            </span>
          </div>
        ) : null}
        {message.errorMessage ? (
          <div className={styles.check}>
            <strong>{it.adminEmailError}</strong>
            <span>
              {message.errorCode ? `${message.errorCode}: ` : ""}
              {message.errorMessage}
            </span>
          </div>
        ) : null}
      </dl>
      <h2 className={styles.sectionTitle}>{it.adminEmailBody}</h2>
      <pre className={styles.pre}>{message.textBody}</pre>
      <h2 className={styles.sectionTitle}>{it.adminEmailEvents}</h2>
      {message.events.length === 0 ? (
        <p className={styles.empty}>—</p>
      ) : (
        <ul className={styles.list}>
          {message.events.map((event) => (
            <li key={event.id} className={styles.item}>
              <span>
                <strong>{event.type}</strong>
                <span className={styles.meta}>
                  {formatEmailWhen(event.occurredAt)}
                  {event.bounceType ? ` · ${event.bounceType}` : ""}
                  {event.summary ? ` · ${event.summary}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {retryable ? (
        <EmailRetryForm id={message.id} />
      ) : message.providerMessageId ? (
        <p className={styles.meta}>{it.adminEmailRetryBlocked}</p>
      ) : null}
    </AdminFrame>
  );
}
