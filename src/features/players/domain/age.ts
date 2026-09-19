import { AGE_OF_MAJORITY } from "@/shared/config/app";

export function ageOn(birthDate: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = on.getUTCDate() - birthDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

export function isMinor(
  birthDate: Date,
  on: Date = new Date(),
  ageOfMajority = AGE_OF_MAJORITY,
): boolean {
  return ageOn(birthDate, on) < ageOfMajority;
}
