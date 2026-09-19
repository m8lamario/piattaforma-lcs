export function normalizePhone(raw: string) {
  return raw.replace(/[()\s.-]/g, "");
}

export function isValidItalianPhone(raw: string) {
  const value = normalizePhone(raw);
  const national = value.startsWith("+39") ? value.slice(3) : value.startsWith("0039") ? value.slice(4) : value;
  if (!/^\d{6,11}$/.test(national)) return false;
  return national.startsWith("3") || national.startsWith("0");
}
