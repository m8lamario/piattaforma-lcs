import type { McpServer } from "@modelcontextprotocol/server";
import {
  approveCertificateByAi,
  flagCertificateByAi,
  getAiCertificateFile,
  listPendingCertificatesForAi,
  type RequestTrace,
} from "@/features/documents/data/aiReview";
import { formatDateOnly } from "@/features/players/domain/dates";
import {
  APPROVE_DESCRIPTION,
  FLAG_DESCRIPTION,
  GET_FILE_DESCRIPTION,
  LIST_PENDING_DESCRIPTION,
  approveCertificateSchema,
  certificateIdSchema,
  flagCertificateSchema,
  listPendingCertificatesSchema,
} from "./schemas";

function jsonResult(data: Record<string, unknown>, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function errorResult(code: string, message: string) {
  return jsonResult({ error: code, message }, true);
}

const REASON_COPY: Record<string, { code: string; message: string }> = {
  invalid_cursor: {
    code: "INVALID_CURSOR",
    message: "Il cursore non è valido. Riparti senza cursor.",
  },
  not_actionable: {
    code: "NOT_ACTIONABLE",
    message: "Il certificato non è in attesa per l’AI, oppure è già stato valutato.",
  },
  kind_changed: {
    code: "KIND_CHANGED",
    message: "Il tipo richiesto dall’edizione è cambiato. Usa flag_certificate, non approvare.",
  },
  expiry_required: {
    code: "EXPIRY_REQUIRED",
    message:
      "Sul certificato agonistico la scadenza è scritta: passala come data_scadenza, successiva a oggi. Se non si legge, segnala. Sul non agonistico la scadenza è un anno dalla visita: se quella data è già passata, segnala.",
  },
  issued_invalid: {
    code: "ISSUED_INVALID",
    message: "La data di visita/rilascio deve essere valida, non futura e non successiva alla scadenza.",
  },
  empty: {
    code: "TEXT_REQUIRED",
    message: "Nota o motivo obbligatorio.",
  },
  too_long: {
    code: "TEXT_TOO_LONG",
    message: "Nota o motivo troppo lunghi.",
  },
};

function fromReason(reason: string) {
  const copy = REASON_COPY[reason] ?? {
    code: "NOT_ACTIONABLE",
    message: "Operazione non consentita.",
  };
  return errorResult(copy.code, copy.message);
}

export function registerCertificateReviewTools(server: McpServer, trace: RequestTrace = {}) {
  server.registerTool(
    "list_pending_certificates",
    {
      title: "Elenco certificati in attesa",
      description: LIST_PENDING_DESCRIPTION,
      inputSchema: listPendingCertificatesSchema,
    },
    async ({ limit, cursor }) => {
      const result = await listPendingCertificatesForAi({ limit, cursor, trace });
      if (!result.ok) return fromReason(result.reason);
      return jsonResult({
        certificates: result.certificates,
        next_cursor: result.next_cursor,
      });
    },
  );

  server.registerTool(
    "get_certificate_file",
    {
      title: "File del certificato",
      description: GET_FILE_DESCRIPTION,
      inputSchema: certificateIdSchema,
    },
    async ({ certificate_id }) => {
      const result = await getAiCertificateFile({ certificateId: certificate_id, trace });
      if (!result.ok) return fromReason(result.reason);
      return jsonResult({
        mime_type: result.mime_type,
        filename: result.filename,
        tipo_richiesto: result.tipo_richiesto,
        regola_scadenza: result.regola_scadenza,
        data_visita_letta: result.data_visita_letta,
        data_scadenza_letta: result.data_scadenza_letta,
        data_scadenza_proposta: result.data_scadenza_proposta,
        expires_at: result.expires_at,
        url: result.url,
      });
    },
  );

  server.registerTool(
    "approve_certificate",
    {
      title: "Approva certificato",
      description: APPROVE_DESCRIPTION,
      inputSchema: approveCertificateSchema,
    },
    async ({ certificate_id, note, data_rilascio, data_scadenza }) => {
      const result = await approveCertificateByAi({
        certificateId: certificate_id,
        note,
        dataRilascio: data_rilascio,
        dataScadenza: data_scadenza,
        trace,
      });
      if (!result.ok) return fromReason(result.reason);
      return jsonResult({
        certificate_id: result.documentId,
        status: "approvato",
        approved_by: "AI",
        data_rilascio: formatDateOnly(result.issuedAt),
        data_scadenza: formatDateOnly(result.expiresAt),
        scadenza_calcolata: result.expiryComputed,
      });
    },
  );

  server.registerTool(
    "flag_certificate",
    {
      title: "Segnala certificato",
      description: FLAG_DESCRIPTION,
      inputSchema: flagCertificateSchema,
    },
    async ({ certificate_id, motivo }) => {
      const result = await flagCertificateByAi({ certificateId: certificate_id, motivo, trace });
      if (!result.ok) return fromReason(result.reason);
      return jsonResult({
        certificate_id: result.documentId,
        status: "da_verificare_manualmente",
      });
    },
  );
}
