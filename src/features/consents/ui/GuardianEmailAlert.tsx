import type { GuardianEmailNotice } from "@/features/consents/domain/guardianEmail";
import { ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

function copyFor(notice: GuardianEmailNotice, here: boolean) {
  if (notice.reason === "undeliverable") {
    return (notice.kind === "secondary" ? it.guardianEmailUndeliverableSecondary : it.guardianEmailUndeliverablePrimary).replace(
      "{email}",
      notice.email,
    );
  }
  if (notice.reason === "awaiting_confirmation") {
    return (here ? it.guardianEmailAwaitingSecondaryHere : it.guardianEmailAwaitingSecondary).replace(
      "{email}",
      notice.email,
    );
  }
  if (here) {
    return (notice.kind === "secondary" ? it.guardianEmailCheckSecondaryHere : it.guardianEmailCheckPrimaryHere).replace(
      "{email}",
      notice.email,
    );
  }
  return (notice.kind === "secondary" ? it.guardianEmailCheckSecondary : it.guardianEmailCheckPrimary).replace(
    "{email}",
    notice.email,
  );
}

type Props = {
  notices: GuardianEmailNotice[];
  href?: string;
  here?: boolean;
};

export function GuardianEmailAlert({ notices, href, here = false }: Props) {
  if (notices.length === 0) return null;
  const canFix = notices.some(
    (notice) => notice.reason === "undeliverable" || notice.reason === "check_address",
  );
  return (
    <div className={fields.bannerStack} role="status">
      {notices.map((notice) => (
        <p
          key={`${notice.kind}-${notice.reason}`}
          className={`${fields.banner} ${notice.tone === "danger" ? fields.bannerDanger : fields.bannerWarn}`}
        >
          {copyFor(notice, here)}
        </p>
      ))}
      {href && canFix ? (
        <ButtonLink href={href} variant="secondary" icon="chevronRight" iconPosition="right">
          {it.guardianEmailFixCta}
        </ButtonLink>
      ) : null}
    </div>
  );
}
