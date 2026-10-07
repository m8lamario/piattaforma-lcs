import { z } from "zod";
import { isValidItalianPhone, normalizePhone } from "@/features/players/domain/phone";
import { schoolNameKey } from "@/features/school-access/domain/normalize";

export const SCHOOL_REQUESTER_ROLES = ["INSTITUTE_REPRESENTATIVE", "TEACHER", "OTHER"] as const;

export const schoolAccessRequestSchema = z.object({
  firstName: z.string().trim().min(1, "Inserisci il nome.").max(80, "Nome troppo lungo."),
  lastName: z.string().trim().min(1, "Inserisci il cognome.").max(80, "Cognome troppo lungo."),
  email: z
    .string()
    .trim()
    .email("Inserisci un'email valida.")
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, "Inserisci il telefono.")
    .refine(isValidItalianPhone, "Inserisci un telefono italiano valido.")
    .transform(normalizePhone),
  schoolName: z
    .string()
    .trim()
    .min(2, "Inserisci il nome della scuola.")
    .max(120, "Nome della scuola troppo lungo."),
  city: z.string().trim().min(2, "Inserisci la città.").max(80, "Città troppo lunga."),
  requesterRole: z.enum(SCHOOL_REQUESTER_ROLES, { message: "Seleziona il tuo ruolo." }),
  institutionalEmail: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Inserisci un'email istituzionale valida.",
    )
    .transform((value) => value.toLowerCase()),
  editionId: z.string().min(1, "Seleziona la competizione."),
});

export type SchoolAccessRequestValues = z.infer<typeof schoolAccessRequestSchema>;

export const activateSchoolAccessSchema = z
  .object({
    token: z.string().min(20, "Link non valido."),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

export const rejectSchoolAccessSchema = z.object({
  id: z.string().min(1),
  rejectionReason: z
    .string()
    .trim()
    .max(500, "Il motivo è troppo lungo.")
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
});

export function schoolAccessKeys(input: { schoolName: string; email: string }) {
  return {
    email: input.email.trim().toLowerCase(),
    schoolNameKey: schoolNameKey(input.schoolName),
  };
}
