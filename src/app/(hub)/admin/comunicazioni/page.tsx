import Link from "next/link";
import { emailDashboardStats, listEmailMessages } from "@/features/emails/data/catalog";
import { EMAIL_PURPOSE_KEYS, isEmailTemplateKey } from "@/features/emails/domain/catalog";
import { EMAIL_STATUSES, isEmailStatus } from "@/features/emails/domain/status";
import { emailPurposeLabel, emailStatusLabel, emailStatusTone, formatEmailWhen } from "@/features/emails/ui/labels";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusChip } from "@/shared/ui/StatusChip";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";
import fields from "@/shared/ui/form.module.css";
import type { EmailStatus } from "@generated/client";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    purpose?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
};

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminEmailsPage({ searchParams }: Props) {
  const query = await searchParams;
  const status = query.status && isEmailStatus(query.status) ? (query.status as EmailStatus) : undefined;
  const purpose = query.purpose && isEmailTemplateKey(query.purpose) ? query.purpose : undefined;
  const sort =
    query.sort === "lastEventAt" || query.sort === "subject" || query.sort === "queuedAt" ? query.sort : "queuedAt";
  const page = Number(query.page ?? "1") || 1;
  const [stats, list] = await Promise.all([
    emailDashboardStats(),
    listEmailMessages({
      q: query.q?.trim() || undefined,
      status,
      purpose,
      from: parseDate(query.from),
      to: parseDate(query.to),
      sort,
      page,
    }),
  ]);

  const filterQs = new URLSearchParams();
  if (query.q) filterQs.set("q", query.q);
  if (status) filterQs.set("status", status);
  if (purpose) filterQs.set("purpose", purpose);
  if (query.from) filterQs.set("from", query.from);
  if (query.to) filterQs.set("to", query.to);
  if (sort !== "queuedAt") filterQs.set("sort", sort);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(filterQs);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/admin/comunicazioni?${qs}` : "/admin/comunicazioni";
  }

  return (
    <AdminFrame path="/admin/comunicazioni">
      <PageHeader
        kicker={it.navAdmin}
        title={it.navAdminEmails}
        description={it.adminEmailsHelp}
      />
      <p>
        <ButtonLink href="/admin/comunicazioni/nuova">{it.adminEmailsNew}</ButtonLink>{" "}
        <ButtonLink href="/admin/comunicazioni/template" variant="secondary">
          {it.adminEmailsTemplates}
        </ButtonLink>
      </p>
      <div className={styles.stats}>
        <p className={styles.stat}>
          <strong>{stats.sent}</strong>
          <span>{it.adminEmailsSent}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.delivered}</strong>
          <span>{it.adminEmailsDelivered}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.failed}</strong>
          <span>{it.adminEmailsFailed}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.bounced}</strong>
          <span>{it.adminEmailsBounced}</span>
        </p>
        <p className={styles.stat}>
          <strong>{stats.complained}</strong>
          <span>{it.adminEmailsComplained}</span>
        </p>
      </div>
      <p className={styles.meta}>
        {it.adminEmailsConfig}: {stats.config.driver}
        {" · "}
        {it.adminEmailsFrom}: {stats.config.from}
        {" · "}
        {it.adminEmailsReplyTo}: {stats.config.replyTo ?? it.adminEmailsNotSet}
        {" · "}
        {it.adminEmailsWebhook}: {stats.config.webhookConfigured ? it.adminEmailsWebhookReady : it.adminEmailsWebhookMissing}
        {" · "}
        {stats.config.live ? it.adminEmailsConfigLive : it.adminEmailsConfigStub}
      </p>

      {stats.recent.length > 0 ? (
        <>
          <h2 className={styles.sectionTitle}>{it.adminEmailsRecent}</h2>
          <ul className={styles.list}>
            {stats.recent.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/comunicazioni/${row.id}`} className={styles.item}>
                  <span>
                    <strong>{row.subject}</strong>
                    <span className={styles.meta}>
                      {row.toAddress} · {emailPurposeLabel(row.purpose)}
                    </span>
                  </span>
                  <StatusChip tone={emailStatusTone(row.status)}>{emailStatusLabel(row.status)}</StatusChip>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {stats.attention.length > 0 ? (
        <>
          <h2 className={styles.sectionTitle}>{it.adminEmailsAttention}</h2>
          <ul className={styles.list}>
            {stats.attention.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/comunicazioni/${row.id}`} className={styles.item}>
                  <span>
                    <strong>{row.subject}</strong>
                    <span className={styles.meta}>
                      {row.toAddress} · {emailPurposeLabel(row.purpose)}
                    </span>
                  </span>
                  <StatusChip tone={emailStatusTone(row.status)}>{emailStatusLabel(row.status)}</StatusChip>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <form className={styles.filters} method="get">
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="q">
              {it.adminEmailRecipient}
            </label>
            <input id="q" name="q" className={fields.input} defaultValue={query.q ?? ""} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="status">
              {it.adminEmailStatus}
            </label>
            <select id="status" name="status" className={fields.input} defaultValue={query.status ?? ""}>
              <option value="">{it.filterAll}</option>
              {EMAIL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {emailStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="purpose">
              {it.adminEmailType}
            </label>
            <select id="purpose" name="purpose" className={fields.input} defaultValue={purpose ?? ""}>
              <option value="">{it.filterAll}</option>
              {EMAIL_PURPOSE_KEYS.map((value) => (
                <option key={value} value={value}>
                  {emailPurposeLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="from">
              {it.adminEmailDateFrom}
            </label>
            <input id="from" name="from" type="date" className={fields.input} defaultValue={query.from ?? ""} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="to">
              {it.adminEmailDateTo}
            </label>
            <input id="to" name="to" type="date" className={fields.input} defaultValue={query.to ?? ""} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="sort">
              {it.adminEmailUpdatedAt}
            </label>
            <select id="sort" name="sort" className={fields.input} defaultValue={sort}>
              <option value="queuedAt">{it.adminEmailSentAt}</option>
              <option value="lastEventAt">{it.adminEmailUpdatedAt}</option>
              <option value="subject">{it.adminEmailSubject}</option>
            </select>
          </div>
          <div>
            <Button type="submit">{it.filterApply}</Button>
          </div>
        </div>
      </form>

      {list.rows.length === 0 ? (
        <p className={styles.empty}>{it.adminEmailsEmpty}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{it.adminEmailRecipient}</th>
                <th>{it.adminEmailSubject}</th>
                <th>{it.adminEmailType}</th>
                <th>{it.adminEmailStatus}</th>
                <th>{it.adminEmailSentAt}</th>
                <th>{it.adminEmailUpdatedAt}</th>
                <th>{it.adminEmailLinkedUser}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/comunicazioni/${row.id}`}>{row.toAddress}</Link>
                  </td>
                  <td>{row.subject}</td>
                  <td>{emailPurposeLabel(row.purpose)}</td>
                  <td>
                    <StatusChip tone={emailStatusTone(row.status)}>{emailStatusLabel(row.status)}</StatusChip>
                  </td>
                  <td>{formatEmailWhen(row.sentAt ?? row.queuedAt)}</td>
                  <td>{formatEmailWhen(row.lastEventAt)}</td>
                  <td>{row.user?.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.pages > 1 ? (
        <p className={styles.pager}>
          {page > 1 ? <Link href={pageHref(page - 1)}>{it.adminEmailPage} {page - 1}</Link> : null}
          <span>
            {it.adminEmailPage} {list.page} / {list.pages}
          </span>
          {page < list.pages ? <Link href={pageHref(page + 1)}>{it.adminEmailPage} {page + 1}</Link> : null}
        </p>
      ) : null}
    </AdminFrame>
  );
}
