import { z } from "zod";
import { AI_LIST_MAX_LIMIT, AI_REVIEW_TEXT_MAX } from "@/features/documents/domain/aiReview";

export const listPendingCertificatesSchema = z.object({
  limit: z.number().int().min(1).max(AI_LIST_MAX_LIMIT).optional(),
  cursor: z.string().min(1).max(200).optional(),
});

export const certificateIdSchema = z.object({
  certificate_id: z.string().min(1).max(64),
});

export const approveCertificateSchema = z.object({
  certificate_id: z.string().min(1).max(64),
  note: z.string().min(1).max(AI_REVIEW_TEXT_MAX),
  data_rilascio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Data della visita o di rilascio letta sul certificato (YYYY-MM-DD)."),
  data_scadenza: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "Obbligatoria solo per l’agonistico: la scadenza scritta sul certificato. Per il non agonistico non serve: vale un anno dalla data di visita.",
    ),
});

export const flagCertificateSchema = z.object({
  certificate_id: z.string().min(1).max(64),
  motivo: z.string().min(1).max(AI_REVIEW_TEXT_MAX),
});

export const LIST_PENDING_DESCRIPTION =
  "Elenca i certificati medici in attesa (PENDING_REVIEW o PREVALIDATED) non ancora valutati dall’AI. Non include segnalati, approvati, rifiutati, scaduti o già rimessi in coda da un admin. Restituisce anagrafica minima: niente codice fiscale, email o telefono. Confronta nome, cognome, data di nascita, tipo richiesto, date, timbro e firma. Non agonistico: la data sul certificato è quella della visita e vale un anno da quel giorno. Agonistico: la scadenza è scritta sul certificato. Non rifiutare mai: approva solo i casi chiari, altrimenti segnala.";

export const GET_FILE_DESCRIPTION =
  "Restituisce un URL temporaneo HTTPS al file PDF o immagine del certificato, con tipo richiesto e regola di scadenza. Usalo solo su un certificate_id ancora in attesa per l’AI. Leggi la data di visita e, se agonistico, la scadenza scritta. Non copiare diagnosi o dati sanitari eccedenti. Non rifiutare.";

export const APPROVE_DESCRIPTION =
  "Approva un certificato chiaramente valido e registra le date. data_rilascio è sempre la data della visita/rilascio letta sul file. Per il non agonistico non passare data_scadenza: la piattaforma imposta un anno da quella visita. Per l’agonistico data_scadenza è obbligatoria e deve essere quella scritta sul certificato. Se le date non si leggono, usa flag_certificate. Non rifiutare.";

export const FLAG_DESCRIPTION =
  "Segnala un certificato dubbio per la revisione manuale. Lo stato del documento resta in attesa; l’admin vede il motivo. Non rifiutare. Obbligatorio se il tipo richiesto al caricamento non coincide più con quello dell’edizione.";
