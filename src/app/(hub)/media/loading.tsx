import { Skeleton } from "@/shared/ui/Skeleton";
import { DelayedSkeleton } from "@/shared/ui/DelayedSkeleton";
import { it } from "@/shared/i18n/it";
import styles from "@/features/media-partners/ui/media.module.css";

export default function MediaLoading() {
  return (
    <DelayedSkeleton>
      <div className={styles.dashboard} aria-busy="true">
        <p className={styles.status} role="status">
          {it.mediaSearchLoading}
        </p>
        <Skeleton variant="title" width="16rem" />
        <Skeleton variant="input" />
        <Skeleton variant="block" height="8rem" />
      </div>
    </DelayedSkeleton>
  );
}
