import type { PublicationFlags, PublicationStatus } from "@/features/consents/domain/boxes";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";

const STATUS_COPY: Record<PublicationStatus, string> = {
  publishable: it.publicationPublishable,
  not_publishable: it.publicationNotPublishable,
  pending_other_parent: it.publicationPending,
};

const STATUS_TONE: Record<PublicationStatus, StatusTone> = {
  publishable: "complete",
  not_publishable: "neutral",
  pending_other_parent: "attention",
};

type Props = {
  flags: PublicationFlags;
  compact?: boolean;
};

export function PublicationChips({ flags, compact }: Props) {
  const extras = compact
    ? []
    : [
        flags.channels ? it.publicationChannels : null,
        flags.promotion ? it.publicationPromotion : null,
        flags.sponsor ? it.publicationSponsor : null,
        flags.press ? it.publicationPress : null,
        flags.interviews ? it.publicationInterviews : null,
        flags.fullSurname ? it.publicationSurname : null,
      ].filter((value): value is string => Boolean(value));

  return (
    <>
      <StatusChip tone={STATUS_TONE[flags.status]}>{STATUS_COPY[flags.status]}</StatusChip>
      {extras.map((label) => (
        <StatusChip key={label} tone="neutral">
          {label}
        </StatusChip>
      ))}
    </>
  );
}
