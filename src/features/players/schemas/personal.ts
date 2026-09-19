import { z } from "zod";
import { isBirthDateAcceptable, parseDateOnly } from "@/features/players/domain/dates";
import { isValidFiscalCode, normalizeFiscalCode } from "@/features/players/domain/fiscalCode";
import { isValidItalianPhone, normalizePhone } from "@/features/players/domain/phone";

export const saveIntentSchema = z.enum(["continue", "exit"]);

export const personalDataSchema = z.object({
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
}).superRefine((value, context) => {
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
  }
});

export type PersonalDataInput = z.infer<typeof personalDataSchema>;
