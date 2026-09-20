import { notFound } from "next/navigation";
import { getEditionAdmin } from "@/features/admin/data/catalog";
import { decimalText, toDatetimeLocalValue } from "@/features/admin/domain/format";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { EditionDeleteForm, EditionForm } from "@/features/admin/ui/EditionForm";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditionDetailPage({ params }: Props) {
  const { id } = await params;
  const edition = await getEditionAdmin(id);
  if (!edition) notFound();

  return (
    <AdminFrame path={`/admin/edizioni/${id}`}>
      <PageHeader
        kicker={edition.competition.name}
        title={edition.name}
        description={`${it.adminTeamsCount}: ${edition._count.teams} · ${it.adminRegistrationsCount}: ${edition._count.registrations}`}
      />
      {edition._count.registrations > 0 ? <p className={styles.meta}>{it.adminEditionHasRegistrations}</p> : null}
      <EditionForm
        mode="edit"
        edition={{
          id: edition.id,
          name: edition.name,
          year: edition.year,
          paymentMode: edition.paymentMode,
          playerFeeAmount: decimalText(edition.playerFeeAmount),
          teamFeeAmount: decimalText(edition.teamFeeAmount),
          isActive: edition.isActive,
          registrationOpensAt: toDatetimeLocalValue(edition.registrationOpensAt),
          registrationClosesAt: toDatetimeLocalValue(edition.registrationClosesAt),
          competitionName: edition.competition.name,
          requirements: edition.requirements,
        }}
      />
      <EditionDeleteForm editionId={edition.id} registrationCount={edition._count.registrations} />
    </AdminFrame>
  );
}
