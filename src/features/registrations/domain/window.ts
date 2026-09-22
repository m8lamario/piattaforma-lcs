export type EditionWindow = {
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  isActive: boolean;
};

export function isRegistrationWindowOpen(edition: EditionWindow, now: Date = new Date()) {
  if (!edition.isActive) return false;
  if (edition.registrationOpensAt && now.getTime() < edition.registrationOpensAt.getTime()) {
    return false;
  }
  if (edition.registrationClosesAt && now.getTime() > edition.registrationClosesAt.getTime()) {
    return false;
  }
  return true;
}

export function windowClosedReason(edition: EditionWindow, now: Date = new Date()) {
  if (!edition.isActive) return "inactive" as const;
  if (edition.registrationOpensAt && now.getTime() < edition.registrationOpensAt.getTime()) {
    return "not_open" as const;
  }
  if (edition.registrationClosesAt && now.getTime() > edition.registrationClosesAt.getTime()) {
    return "closed" as const;
  }
  return null;
}

export function formatWindowUntil(closesAt: Date | null, locale = "it-IT") {
  if (!closesAt) return null;
  return closesAt.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}
