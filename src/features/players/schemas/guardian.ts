import { z } from "zod";
import { GUARDIAN_RELATIONSHIPS } from "@/features/players/domain/personal";
import { isValidItalianPhone, normalizePhone } from "@/features/players/domain/phone";
import { saveIntentSchema } from "./personal";

export const guardianSchema = z
  .object({
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
    g3: z.enum(["OTHER_PARENT", "SOLE"], { message: "Indica se c’è un altro genitore." }),
    secondFirstName: z.string().trim().max(80).optional(),
    secondLastName: z.string().trim().max(80).optional(),
    secondEmail: z.string().trim().optional(),
    g1: z.boolean().refine((value) => value, { error: "Conferma di essere genitore o tutore." }),
    intent: saveIntentSchema,
  })
  .superRefine((value, ctx) => {
    if (value.g3 !== "OTHER_PARENT") return;
    if (!value.secondFirstName) {
      ctx.addIssue({ code: "custom", message: "Inserisci il nome dell’altro genitore.", path: ["secondFirstName"] });
    }
    if (!value.secondLastName) {
      ctx.addIssue({ code: "custom", message: "Inserisci il cognome dell’altro genitore.", path: ["secondLastName"] });
    }
    const second = value.secondEmail?.trim().toLowerCase() ?? "";
    if (!second || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(second)) {
      ctx.addIssue({ code: "custom", message: "Inserisci l’email dell’altro genitore.", path: ["secondEmail"] });
      return;
    }
    if (second === value.email) {
      ctx.addIssue({
        code: "custom",
        message: "L’email dell’altro genitore deve essere diversa.",
        path: ["secondEmail"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    secondEmail: value.secondEmail?.trim().toLowerCase() || undefined,
  }));

export type GuardianInput = z.infer<typeof guardianSchema>;
