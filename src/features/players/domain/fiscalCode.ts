const ODD: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

const EVEN: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
};

const FORMAT =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

export function normalizeFiscalCode(raw: string) {
  return raw.replace(/[\s.]/g, "").toUpperCase();
}

export function fiscalCodeControlChar(body: string) {
  let sum = 0;
  for (let index = 0; index < 15; index += 1) {
    const char = body[index] ?? "";
    const table = index % 2 === 0 ? ODD : EVEN;
    const value = table[char];
    if (value === undefined) return "";
    sum += value;
  }
  return String.fromCharCode(65 + (sum % 26));
}

export function isValidFiscalCode(raw: string) {
  const code = normalizeFiscalCode(raw);
  if (code.length !== 16 || !FORMAT.test(code)) return false;
  return fiscalCodeControlChar(code.slice(0, 15)) === code[15];
}

const OMOCODIA_DIGIT: Record<string, string> = {
  L: "0",
  M: "1",
  N: "2",
  P: "3",
  Q: "4",
  R: "5",
  S: "6",
  T: "7",
  U: "8",
  V: "9",
};

const FISCAL_MONTH: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  H: 6,
  L: 7,
  M: 8,
  P: 9,
  R: 10,
  S: 11,
  T: 12,
};

function fiscalDigit(char: string) {
  if (char >= "0" && char <= "9") return char;
  return OMOCODIA_DIGIT[char] ?? null;
}

/** True when the date encoded in an Italian fiscal code matches the birth date (month, day, year mod 100). */
export function fiscalCodeMatchesBirthDate(raw: string, birthDate: Date) {
  const code = normalizeFiscalCode(raw);
  if (!isValidFiscalCode(code)) return false;
  const yearDigits = `${fiscalDigit(code[6] ?? "") ?? ""}${fiscalDigit(code[7] ?? "") ?? ""}`;
  const dayDigits = `${fiscalDigit(code[9] ?? "") ?? ""}${fiscalDigit(code[10] ?? "") ?? ""}`;
  const month = FISCAL_MONTH[code[8] ?? ""];
  if (yearDigits.length !== 2 || dayDigits.length !== 2 || !month) return false;
  let day = Number(dayDigits);
  if (day > 40) day -= 40;
  if (day < 1 || day > 31) return false;
  return (
    birthDate.getUTCMonth() + 1 === month &&
    birthDate.getUTCDate() === day &&
    birthDate.getUTCFullYear() % 100 === Number(yearDigits)
  );
}
