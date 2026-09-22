import { z } from "zod";
import { ANONYMIZE_CONFIRM_WORD, DELETE_CONFIRM_WORD } from "@/features/admin/domain/lifecycle";

export const removePlayerSchema = z.object({
  teamId: z.string().min(1),
  membershipId: z.string().min(1),
  confirm: z.string().min(1, "Scrivi il cognome per confermare."),
});

export const deleteAccountSchema = z.object({
  userId: z.string().min(1),
  confirm: z
    .string()
    .min(1, `Scrivi ${DELETE_CONFIRM_WORD} per confermare.`),
});

export const anonymizeAccountSchema = z.object({
  userId: z.string().min(1),
  confirm: z
    .string()
    .min(1, `Scrivi ${ANONYMIZE_CONFIRM_WORD} per confermare.`),
});
