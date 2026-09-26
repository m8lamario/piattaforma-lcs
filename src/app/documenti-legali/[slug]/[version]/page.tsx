import { notFound } from "next/navigation";
import { isLegalCatalogSlug } from "@/features/consents/domain/catalog";
import { getLegalVersionBySlugAndVersion } from "@/features/consents/data/legal";
import { LegalPublicArticle } from "@/features/consents/ui/LegalPublicArticle";

type Props = { params: Promise<{ slug: string; version: string }> };

export default async function LegalVersionPage({ params }: Props) {
  const { slug, version } = await params;
  if (!isLegalCatalogSlug(slug)) notFound();
  const row = await getLegalVersionBySlugAndVersion(slug, version);
  if (!row) notFound();

  return (
    <LegalPublicArticle
      slug={slug}
      archivedVersion={{
        version: row.version,
        body: row.body,
        isCurrent: row.isCurrent,
      }}
    />
  );
}
