import { z } from "zod";
import { ageOn } from "@/features/players/domain/age";
import { isBirthDateAcceptable, parseDateOnly } from "@/features/players/domain/dates";
import { fiscalCodeMatchesBirthDate, isValidFiscalCode, normalizeFiscalCode } from "@/features/players/domain/fiscalCode";
import { isValidItalianPhone, normalizePhone } from "@/features/players/domain/phone";
import { PLAYER_SHIRT_SIZE_VALUES } from "@/features/players/domain/shirtSize";
import { MIN_REGISTRATION_AGE } from "@/shared/config/app";

export const saveIntentSchema = z.enum(["continue", "exit"]);

export const shirtSizeSchema = z.enum(PLAYER_SHIRT_SIZE_VALUES, { message: "Scegli la taglia della maglia." });

const identityFields = {
  firstName: z.string().trim().min(1, "Inserisci il nome.").max(80, "Nome troppo lungo."),
  lastName: z.string().trim().min(1, "Inserisci il cognome.").max(80, "Cognome troppo lungo."),
  birthDate: z.string().trim().min(1, "Inserisci la data di nascita."),
  fiscalCode: z
    .string()
    .trim()
    .min(1, "Inserisci il codice fiscale.")
    .transform(normalizeFiscalCode)
    .refine(isValidFiscalCode, "Il codice fiscale non è valido."),
  phone: z
    .string()
    .trim()
    .min(1, "Inserisci il telefono.")
    .refine(isValidItalianPhone, "Inserisci un telefono italiano valido.")
    .transform(normalizePhone),
  intent: saveIntentSchema,
};

function refineBirthAndFiscal<T extends { birthDate: string; fiscalCode: string }>(
  value: T,
  context: z.RefinementCtx,
) {
  const birthDate = parseDateOnly(value.birthDate);
  if (!birthDate) {
    context.addIssue({
      code: "custom",
      path: ["birthDate"],
      message: "Inserisci una data di nascita valida.",
    });
    return;
  }
  if (!isBirthDateAcceptable(birthDate)) {
    context.addIssue({
      code: "custom",
      path: ["birthDate"],
      message: "La data di nascita non può essere nel futuro.",
    });
    return;
  }
  if (ageOn(birthDate) < MIN_REGISTRATION_AGE) {
    context.addIssue({
      code: "custom",
      path: ["birthDate"],
      message: "L’iscrizione è ammessa dai 14 anni compiuti.",
    });
  }
  if (!fiscalCodeMatchesBirthDate(value.fiscalCode, birthDate)) {
    context.addIssue({
      code: "custom",
      path: ["fiscalCode"],
      message: "Il codice fiscale non corrisponde alla data di nascita.",
    });
  }
}

export const staffPersonalDataSchema = z.object(identityFields).superRefine(refineBirthAndFiscal);

export const personalDataSchema = z
  .object({
    ...identityFields,
    shirtSize: shirtSizeSchema,
  })
  .superRefine(refineBirthAndFiscal);

export type PersonalDataInput = z.infer<typeof personalDataSchema>;
export type StaffPersonalDataInput = z.infer<typeof staffPersonalDataSchema>;
