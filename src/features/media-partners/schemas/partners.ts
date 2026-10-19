import { z } from "zod";

export const mediaPartnerOrgSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il nome dell’organizzazione.").max(120),
  competitionIds: z.array(z.string().min(1)).min(1, "Seleziona almeno una competizione."),
});

export const createMediaPartnerAccountSchema = z.object({
  mediaPartnerId: z.string().min(1),
  firstName: z.string().trim().min(1, "Inserisci il nome.").max(80),
  lastName: z.string().trim().min(1, "Inserisci il cognome.").max(80),
  email: z
    .string()
    .trim()
    .email("Inserisci un'email valida.")
    .transform((value) => value.toLowerCase()),
});

export const mediaPartnerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const activateMediaPartnerSchema = z
  .object({
    token: z.string().min(20, "Link non valido."),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

export const mediaSearchSchema = z.object({
  query: z.string().trim().max(80),
});

export const mediaCardSchema = z.object({
  registrationId: z.string().min(1),
});
