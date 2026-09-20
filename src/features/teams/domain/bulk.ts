import { z } from "zod";
import { BULK_INVITE_MAX } from "@/shared/config/app";

export const bulkInviteRowSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email non valida.")
    .transform((value) => value.toLowerCase()),
  firstName: z.string().trim().min(1, "Nome mancante.").max(80),
  lastName: z.string().trim().min(1, "Cognome mancante.").max(80),
});

export type BulkInviteRow = z.infer<typeof bulkInviteRowSchema>;

export type BulkInviteParseResult = {
  rows: BulkInviteRow[];
  errors: { line: number; message: string }[];
};

export function parseBulkInviteCsv(text: string, maxRows = BULK_INVITE_MAX): BulkInviteParseResult {
  const rows: BulkInviteRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index]?.trim() ?? "";
    if (!raw) continue;
    const parts = raw.split(",").map((part) => part.trim());
    if (index === 0 && parts[0]?.toLowerCase() === "email") {
      continue;
    }
    if (parts.length > 3 && parts.slice(3).some((part) => part.length > 0)) {
      errors.push({ line: lineNumber, message: "Usa solo email, nome e cognome. Mai il codice fiscale." });
      continue;
    }
    if (rows.length >= maxRows) {
      errors.push({ line: lineNumber, message: `Massimo ${maxRows} righe.` });
      continue;
    }
    const parsed = bulkInviteRowSchema.safeParse({
      email: parts[0],
      firstName: parts[1],
      lastName: parts[2],
    });
    if (!parsed.success) {
      errors.push({ line: lineNumber, message: parsed.error.issues[0]?.message ?? "Riga non valida." });
      continue;
    }
    rows.push(parsed.data);
  }

  return { rows, errors };
}
