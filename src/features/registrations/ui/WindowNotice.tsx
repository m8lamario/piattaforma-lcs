import { formatWindowUntil, isRegistrationWindowOpen, type EditionWindow } from "@/features/registrations/domain/window";
import { it } from "@/shared/i18n/it";
import { StatusChip } from "@/shared/ui/StatusChip";
import fields from "@/shared/ui/form.module.css";

export function WindowNotice({ edition }: { edition: EditionWindow }) {
  const open = isRegistrationWindowOpen(edition);
  if (!open) {
    return (
      <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
        {it.windowClosed}
      </p>
    );
  }
  const until = formatWindowUntil(edition.registrationClosesAt);
  if (!until) return null;
  return (
    <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
      {it.windowUntil.replace("{date}", until)}
    </p>
  );
}

/** Compact header variant: the closed state still surfaces as a banner via WindowNotice. */
export function WindowChip({ edition }: { edition: EditionWindow }) {
  if (!isRegistrationWindowOpen(edition)) {
    return <StatusChip tone="attention">{it.windowClosedShort}</StatusChip>;
  }
  const until = formatWindowUntil(edition.registrationClosesAt);
  return (
    <StatusChip tone="complete">{until ? it.windowOpenShort.replace("{date}", until) : it.windowOpenNoDate}</StatusChip>
  );
}
