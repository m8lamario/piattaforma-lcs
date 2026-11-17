import { z } from "zod";

export const inviteLeagueSupervisorSchema = z.object({
  editionId: z.string().min(1, "Seleziona un’edizione valida."),
  firstName: z.string().trim().min(1, "Inserisci il nome.").max(80),
  lastName: z.string().trim().min(1, "Inserisci il cognome.").max(80),
  email: z
    .string()
    .trim()
    .email("Inserisci un'email valida.")
    .transform((value) => value.toLowerCase()),
});

export const leagueSupervisorStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const leagueSupervisorEditionSchema = z.object({
  id: z.string().min(1),
  editionId: z.string().min(1, "Seleziona un’edizione valida."),
});

export const activateLeagueSupervisorSchema = z
  .object({
    token: z.string().min(20, "Link non valido."),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });
