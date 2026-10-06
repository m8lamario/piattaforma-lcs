import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL_CATALOG, legalEntryBySlug } from "@/features/consents/domain/catalog";
import { LegalProse } from "@/features/consents/ui/LegalProse";
import { readLegalDocument } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "@/app/privacy/page.module.css";

type Props = {
  slug: string;
  afterProse?: ReactNode;
  archivedVersion?: {
    version: string;
    body: string;
    isCurrent: boolean;
  };
};

export async function LegalPublicArticle({ slug, afterProse, archivedVersion }: Props) {
  const entry = legalEntryBySlug(slug);
  if (!entry) {
    throw new Error("Documento legale sconosciuto.");
  }
  const body = archivedVersion?.body ?? (await readLegalDocument(slug));

  return (
    <PublicShell>
      <main className={styles.main}>
        <article className={styles.article}>
          <p className={styles.kicker}>{it.legalIndexTitle}</p>
          <h1>{entry.title}</h1>
          {archivedVersion ? (
            <p>
              {it.consentVersion} {archivedVersion.version}
            </p>
          ) : null}
          {body.includes("[INSERIRE") ? <p className={styles.notice}>{it.legalPlaceholderNotice}</p> : null}
          {archivedVersion && !archivedVersion.isCurrent ? (
            <p className={styles.notice}>{it.legalArchivedVersionNotice}</p>
          ) : null}
          <LegalProse body={body} />
          {afterProse}
          {archivedVersion ? (
            <p>
              <Link href={entry.publicPath}>{it.legalCurrentVersionLink}</Link>
            </p>
          ) : null}
          <nav className={styles.index} aria-label={it.legalNav}>
            {LEGAL_CATALOG.map((item) =>
              item.slug === slug ? (
                <span key={item.slug} aria-current="page">
                  {item.title}
                </span>
              ) : (
                <Link key={item.slug} href={item.publicPath}>
                  {item.title}
                </Link>
              ),
            )}
          </nav>
          <p>
            <Link href="/">{it.backHome}</Link>
          </p>
        </article>
      </main>
    </PublicShell>
  );
}
