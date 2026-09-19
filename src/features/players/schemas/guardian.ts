import { z } from "zod";
import { GUARDIAN_RELATIONSHIPS } from "@/features/players/domain/personal";
import { isValidItalianPhone, normalizePhone } from "@/features/players/domain/phone";
import { saveIntentSchema } from "./personal";

export const guardianSchema = z.object({
  firstName: z.string().trim().min(1, "Inserisci il nome del tutore.").max(80),
  lastName: z.string().trim().min(1, "Inserisci il cognome del tutore.").max(80),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS, {
    message: "Indica il rapporto con il giocatore.",
  }),
  email: z
    .string()
    .trim()
    .email("Inserisci un'email valida.")
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, "Inserisci il telefono del tutore.")
    .refine(isValidItalianPhone, "Inserisci un telefono italiano valido.")
    .transform(normalizePhone),
  intent: saveIntentSchema,
});

export type GuardianInput = z.infer<typeof guardianSchema>;
