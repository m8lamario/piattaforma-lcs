import { listActiveEditionsForAccess } from "@/features/school-access/data/requests";
import { SchoolLanding } from "@/features/school-access/ui/SchoolLanding";
import { HeroPhotoPreload } from "@/features/auth/ui/HeroPhotoPreload";
import { PublicShell } from "@/shared/ui/PublicShell";

export default async function SchoolAccessPage() {
  const editions = await listActiveEditionsForAccess();

  return (
    <PublicShell>
      <HeroPhotoPreload />
      <SchoolLanding
        editions={editions.map((edition) => ({
          id: edition.id,
          label: `${edition.competition.name} · ${edition.name} (${edition.year})`,
        }))}
      />
    </PublicShell>
  );
}
