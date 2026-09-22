import { z } from "zod";

export const REQUIREMENT_CODES = [
  "PERSONAL_DATA",
  "GUARDIAN_IF_MINOR",
  "MEDICAL_CERT",
  "PRIVACY",
  "MEDIA_RELEASE",
  "PAYMENT",
] as const;

export const editionFormSchema = z.object({
  competitionName: z.string().trim().min(2, "Inserisci il nome della competizione.").max(120),
  editionName: z.string().trim().min(1, "Inserisci il nome dell’edizione.").max(80),
  year: z.coerce.number().int().min(2000).max(2100),
  paymentMode: z.enum(["PLAYER", "TEAM", "BOTH"]),
  playerFeeAmount: z.string().optional(),
  teamFeeAmount: z.string().optional(),
  isActive: z.string().optional(),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),
});

export const teamFormSchema = z.object({
  editionId: z.string().min(1),
  schoolName: z.string().trim().min(2, "Inserisci l’istituto.").max(120),
  schoolCity: z.string().trim().max(80).optional(),
  teamName: z.string().trim().min(2, "Inserisci il nome della squadra.").max(120),
});

export const staffInviteSchema = z.object({
  teamId: z.string().min(1),
  email: z.string().trim().email("Inserisci un'email valida.").transform((value) => value.toLowerCase()),
});

export const redeemStaffSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri.").optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((value) => !value.password || value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });
