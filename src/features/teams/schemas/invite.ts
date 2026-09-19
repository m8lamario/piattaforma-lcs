import { z } from "zod";

export const createInviteSchema = z.object({
  teamId: z.string().min(1, "Squadra mancante."),
  email: z.string().trim().email("Inserisci un'email valida.").transform((value) => value.toLowerCase()),
  firstName: z
    .string()
    .trim()
    .max(80, "Nome troppo lungo.")
    .optional()
    .transform((value) => value || undefined),
  lastName: z
    .string()
    .trim()
    .max(80, "Cognome troppo lungo.")
    .optional()
    .transform((value) => value || undefined),
});

export const redeemInviteSchema = z
  .object({
    token: z.string().min(20, "Invito non valido."),
    firstName: z.string().trim().min(1, "Inserisci il nome.").max(80),
    lastName: z.string().trim().min(1, "Inserisci il cognome.").max(80),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;
