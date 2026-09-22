import { formatWindowUntil, isRegistrationWindowOpen, type EditionWindow } from "@/features/registrations/domain/window";
import { it } from "@/shared/i18n/it";
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
