import { notFound, redirect } from "next/navigation";
import { getEditionFeeBoard } from "@/features/admin/data/team-fees";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { TeamFeesManager } from "@/features/admin/ui/TeamFeesManager";
import { isSuperAdmin } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditionFeesPage({ params }: Props) {
  const { id } = await params;
  const [{ actor }, board] = await Promise.all([
    requireStaff(`/admin/edizioni/${id}/quote`),
    getEditionFeeBoard(id),
  ]);
  if (!isSuperAdmin(actor)) redirect(`/admin/edizioni/${id}`);
  if (!board) notFound();

  return (
    <AdminFrame path={`/admin/edizioni/${id}/quote`} actor={actor}>
      <PageHeader
        kicker={`${board.competitionName} · ${board.name}`}
        title={it.adminFeesTitle}
        description={it.adminFeesHelp}
        aside={
          <ButtonLink href={`/admin/edizioni/${id}`} variant="secondary">
            {it.adminFeesBack}
          </ButtonLink>
        }
      />
      <TeamFeesManager
        editionId={board.id}
        currency={board.currency}
        defaults={board.defaults}
        teams={board.teams}
      />
    </AdminFrame>
  );
}
