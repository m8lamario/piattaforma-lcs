export function toDatetimeLocalValue(value: Date | null | undefined) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function decimalText(value: { toString(): string } | string | number | null | undefined) {
  if (value == null) return "";
  return String(value);
}
