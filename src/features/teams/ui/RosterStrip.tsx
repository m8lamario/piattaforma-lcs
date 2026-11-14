import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { Icon } from "@/shared/ui/Icon";
import {
  rosterFilterHref,
  type RosterCauseCounts,
  type RosterCounts,
  type RosterFilter,
} from "@/features/teams/domain/roster";
import styles from "./RosterStrip.module.css";

const TABS: { filter: RosterFilter | null; label: string; count: (counts: RosterCounts) => number }[] = [
  { filter: null, label: it.rosterFilterAllTab, count: (counts) => counts.total },
  { filter: "open", label: it.rosterCountsOpen, count: (counts) => counts.invited + counts.inProgress + counts.attention },
  { filter: "ok", label: it.rosterCountsOk, count: (counts) => counts.ok },
  { filter: "invited", label: it.rosterCountsInvited, count: (counts) => counts.invited },
  { filter: "inProgress", label: it.rosterCountsProgress, count: (counts) => counts.inProgress },
  { filter: "attention", label: it.rosterCountsAttention, count: (counts) => counts.attention },
  { filter: "withdrawn", label: it.rosterCountsWithdrawn, count: (counts) => counts.withdrawn },
];

const CAUSES: { filter: keyof RosterCauseCounts; label: string }[] = [
  { filter: "unverified", label: it.rosterFilterUnverified },
  { filter: "guardian", label: it.rosterFilterGuardian },
  { filter: "unpaid", label: it.rosterFilterUnpaid },
  { filter: "medical", label: it.rosterFilterMedical },
];

const FILTER_LABEL: Partial<Record<RosterFilter, string>> = {
  publication: it.rosterFilterPublication,
  unverified: it.rosterFilterUnverified,
  guardian: it.rosterFilterGuardian,
  unpaid: it.rosterFilterUnpaid,
  medical: it.rosterFilterMedical,
};

export function RosterStrip({
  counts,
  causes,
  current,
}: {
  counts: RosterCounts;
  causes: RosterCauseCounts;
  current?: RosterFilter | null;
}) {
  const active = current ?? null;
  const causeLabel = active ? FILTER_LABEL[active] : undefined;
  return (
    <div className={styles.bar}>
      <nav className={styles.tabs} aria-label={it.rosterFilterBar}>
        {TABS.filter((tab) => tab.filter === null || tab.filter === active || tab.count(counts) > 0).map((tab) => (
          <Link
            key={tab.filter ?? "all"}
            href={rosterFilterHref(tab.filter)}
            className={styles.tab}
            aria-current={active === tab.filter ? "page" : undefined}
            data-tone={tab.filter === "attention" ? "attention" : undefined}
          >
            {tab.label}
            <span className={styles.count}>{tab.count(counts)}</span>
          </Link>
        ))}
      </nav>
      {CAUSES.some((cause) => causes[cause.filter] > 0) ? (
        <nav className={styles.causes} aria-label={it.rosterCauseNav}>
          <span className={styles.causesLabel}>{it.rosterCauseNav}</span>
          {CAUSES.filter((cause) => causes[cause.filter] > 0 || active === cause.filter).map((cause) => (
            <Link
              key={cause.filter}
              href={rosterFilterHref(cause.filter)}
              className={styles.cause}
              aria-current={active === cause.filter ? "page" : undefined}
            >
              {cause.label}
              <span>{causes[cause.filter]}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {causeLabel ? (
        <p className={styles.active} role="status">
          {it.rosterFilterActive.replace("{label}", causeLabel)}
          <Link href="/squadra" className={styles.clear}>
            <Icon name="close" size={14} />
            {it.rosterFilterClear}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
