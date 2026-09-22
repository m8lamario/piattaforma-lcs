import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Inserisci la password attuale."),
    newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

export const requestResetSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida.").transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "Link non valido."),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });
