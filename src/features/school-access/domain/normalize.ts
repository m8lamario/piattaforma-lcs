export function schoolNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function schoolCityKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function schoolsMatch(left: { name: string; city: string | null }, right: { name: string; city: string }) {
  return schoolNameKey(left.name) === schoolNameKey(right.name) && schoolCityKey(left.city ?? "") === schoolCityKey(right.city);
}
