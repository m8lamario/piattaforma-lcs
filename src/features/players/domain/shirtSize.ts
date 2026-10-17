export const PLAYER_SHIRT_SIZE_VALUES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type PlayerShirtSize = (typeof PLAYER_SHIRT_SIZE_VALUES)[number];

const SIZE_SET = new Set<string>(PLAYER_SHIRT_SIZE_VALUES);

export function isValidShirtSize(value: string | null | undefined): value is PlayerShirtSize {
  return Boolean(value && SIZE_SET.has(value));
}

export function shirtSizeLabel(value: string | null | undefined) {
  if (!isValidShirtSize(value)) return null;
  return value;
}

export const PLAYER_SHIRT_SIZE_OPTIONS = PLAYER_SHIRT_SIZE_VALUES.map((value) => ({
  value,
  label: value,
}));
