export const EMAIL_NAME_PLACEHOLDER_LAST = "—";

function titleCaseSegment(segment: string) {
  const trimmed = segment.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase("it-IT") + trimmed.slice(1).toLocaleLowerCase("it-IT");
}

export function namesFromEmail(email: string) {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const withoutTag = local.split("+")[0] ?? "";
  const parts = withoutTag.split(/[._+-]+/).map((part) => part.trim()).filter(Boolean);
  const firstName = titleCaseSegment(parts[0] ?? "") || "Giocatore";
  const lastName =
    parts.length >= 2
      ? parts.slice(1).map(titleCaseSegment).filter(Boolean).join(" ")
      : EMAIL_NAME_PLACEHOLDER_LAST;
  return { firstName, lastName };
}

export function displayNameFromEmail(email: string) {
  const { firstName, lastName } = namesFromEmail(email);
  if (lastName === EMAIL_NAME_PLACEHOLDER_LAST) return firstName;
  return `${firstName} ${lastName}`;
}
