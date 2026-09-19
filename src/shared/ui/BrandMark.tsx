import Link from "next/link";
import { it } from "@/shared/i18n/it";
import styles from "./BrandMark.module.css";

type Props = {
  href?: string;
  compact?: boolean;
};

export function BrandMark({ href = "/", compact = false }: Props) {
  const inner = (
    <>
      <span className={styles.rail} aria-hidden="true" />
      <span className={styles.lockup} aria-hidden="true">
        <span className={styles.esl}>ESL</span>
        <span className={compact ? styles.productCompact : styles.product}>{it.brandProduct}</span>
      </span>
    </>
  );

  if (!href) {
    return <span className={styles.brand}>{inner}</span>;
  }

  return (
    <Link href={href} className={styles.brand} aria-label={it.appName}>
      {inner}
    </Link>
  );
}
