import { listActiveEditionsForAccess } from "@/features/school-access/data/requests";
import { SchoolLanding } from "@/features/school-access/ui/SchoolLanding";
import { FieldMark } from "@/shared/ui/FieldMark";
import { PublicShell } from "@/shared/ui/PublicShell";

export default async function SchoolAccessPage() {
  const editions = await listActiveEditionsForAccess();

  return (
    <PublicShell>
      <FieldMark />
      <SchoolLanding
        editions={editions.map((edition) => ({
          id: edition.id,
          label: `${edition.competition.name} · ${edition.name} (${edition.year})`,
        }))}
      />
    </PublicShell>
  );
}
