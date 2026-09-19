import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
});

export type LoginInput = z.infer<typeof loginSchema>;
