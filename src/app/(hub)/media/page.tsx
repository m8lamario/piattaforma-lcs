import { EmptyState } from "@/shared/ui/EmptyState";
import { requireMediaPartner } from "@/shared/authz/requireStaff";
import { MediaDashboard } from "@/features/media-partners/ui/MediaDashboard";
import { it } from "@/shared/i18n/it";

export default async function MediaPage() {
  const { actor, suspended } = await requireMediaPartner("/media");
  if (suspended) {
    return (
      <EmptyState icon="camera" title={it.mediaSuspendedTitle}>
        <p>{it.mediaSuspendedLead}</p>
      </EmptyState>
    );
  }

  return <MediaDashboard organizationName={actor.mediaPartner?.organizationName} />;
}
