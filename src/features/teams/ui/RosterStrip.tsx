import Link from "next/link";
import { it } from "@/shared/i18n/it";
import { rosterFilterHref, type RosterCounts, type RosterFilter } from "@/features/teams/domain/roster";
import styles from "./TeamRoster.module.css";

const CELLS: { filter: RosterFilter; label: string; count: (counts: RosterCounts) => number }[] = [
  { filter: "ok", label: it.rosterCountsOk, count: (counts) => counts.ok },
  { filter: "invited", label: it.rosterCountsInvited, count: (counts) => counts.invited },
  { filter: "inProgress", label: it.rosterCountsProgress, count: (counts) => counts.inProgress },
  { filter: "attention", label: it.rosterCountsAttention, count: (counts) => counts.attention },
  { filter: "withdrawn", label: it.rosterCountsWithdrawn, count: (counts) => counts.withdrawn },
];

export function RosterStrip({
  counts,
  current,
}: {
  counts: RosterCounts;
  current?: RosterFilter | null;
}) {
  return (
    <div className={styles.strip}>
      {CELLS.map((cell) => {
        const href = rosterFilterHref(cell.filter);
        const selected = current === cell.filter;
        return (
          <Link
            key={cell.filter}
            href={href}
            className={styles.stripLink}
            aria-current={selected ? "page" : undefined}
          >
            <strong>{cell.count(counts)}</strong>
            <span>{cell.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
