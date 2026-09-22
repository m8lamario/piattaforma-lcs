import { ERROR_CODES, type ErrorCode } from "./codes";

export type ErrorCategory =
  | "AUTH"
  | "AUTHZ"
  | "IDENTITY"
  | "REGISTRATION"
  | "INVITES"
  | "DOCUMENTS"
  | "CONSENTS"
  | "PAYMENTS"
  | "TEAMS"
  | "SYSTEM"
  | "VALIDATION"
  | "LIFECYCLE";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type RecoveryAction =
  | "retry"
  | "login"
  | "logout_retry_invite"
  | "contact_org"
  | "correct_input"
  | "use_original_account"
  | "withdraw_registration"
  | "request_new_invite"
  | "wait"
  | "none";

export type ErrorDefinition = {
  category: ErrorCategory;
  technical: string;
  severity: ErrorSeverity;
  httpStatus: number;
  recovery: RecoveryAction;
  retrySafe: boolean;
  docsFile: string;
};

function def(
  category: ErrorCategory,
  technical: string,
  httpStatus: number,
  recovery: RecoveryAction,
  extra?: Partial<Pick<ErrorDefinition, "severity" | "retrySafe">>,
): ErrorDefinition {
  return {
    category,
    technical,
    httpStatus,
    recovery,
    severity: extra?.severity ?? "error",
    retrySafe: extra?.retrySafe ?? false,
    docsFile: `docs/errors/${category}.md`,
  };
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  AUTH_INVALID_CREDENTIALS: def("AUTH", "Credenziali non corrispondono.", 401, "correct_input"),
  AUTH_RATE_LIMITED: def("AUTH", "Rate limit login superato.", 429, "wait", { severity: "warning" }),
  AUTH_SESSION_REQUIRED: def("AUTH", "Sessione assente su mutazione autenticata.", 401, "login"),
  AUTH_ACCOUNT_MISSING: def("AUTH", "User id di sessione senza record User.", 401, "login"),
  AUTH_NO_LOCAL_PASSWORD: def("AUTH", "Account senza passwordHash locale.", 400, "contact_org"),
  AUTH_CURRENT_PASSWORD_MISMATCH: def("AUTH", "Password attuale non verifica.", 400, "correct_input"),
  AUTH_RESET_TOKEN_INVALID: def("AUTH", "Token reset assente, scaduto o già consumato.", 400, "request_new_invite"),
  AUTH_ACCOUNT_CREATED_LOGIN_FAILED: def("AUTH", "User creato ma signIn credentials fallito.", 500, "login", {
    severity: "warning",
    retrySafe: true,
  }),
  AUTH_EMAIL_NOT_VERIFIED: def("AUTH", "emailVerified assente su azione vincolante.", 403, "contact_org"),

  FORBIDDEN_RESOURCE: def("AUTHZ", "authorize ha negato l’azione sulla risorsa.", 403, "none"),
  FORBIDDEN_REGISTRATION_WRITE: def("AUTHZ", "registration:write denied.", 403, "none"),
  FORBIDDEN_TEAM_INVITE: def("AUTHZ", "team:invite denied.", 403, "none"),
  FORBIDDEN_TEAM_MANAGE: def("AUTHZ", "team:read/update denied.", 403, "none"),
  FORBIDDEN_DOCUMENT_FILE: def("AUTHZ", "document:read_file denied.", 404, "none"),
  FORBIDDEN_PAYMENT_PLAYER: def("AUTHZ", "payment:create_player denied.", 403, "none"),
  FORBIDDEN_PAYMENT_TEAM: def("AUTHZ", "payment:create_team denied.", 403, "none"),
  FORBIDDEN_STAFF_INVITE: def("AUTHZ", "staff:invite denied.", 403, "none"),

  IDENTITY_FISCAL_CODE_ASSOCIATED: def("IDENTITY", "CF unique: altro PlayerProfile detiene il codice.", 409, "use_original_account"),
  IDENTITY_EXISTING_ACCOUNT_DIFFERENT_EMAIL: def(
    "IDENTITY",
    "CF associato a un User diverso (email distinta). Non rivelare l’email.",
    409,
    "use_original_account",
  ),
  IDENTITY_DUPLICATE_ACCOUNT: def("IDENTITY", "Stesso CF, due User: secondo account non può completare l’anagrafica.", 409, "use_original_account"),
  IDENTITY_DUPLICATE_REGISTRATION: def(
    "IDENTITY",
    "L’account titolare del CF ha già una registration attiva sulla stessa edizione.",
    409,
    "contact_org",
    { severity: "critical" },
  ),
  IDENTITY_PLAYER_ALREADY_ON_TEAM: def(
    "IDENTITY",
    "L’account titolare del CF è già nel team target.",
    409,
    "contact_org",
    { severity: "critical" },
  ),
  IDENTITY_CONFLICT_NEEDS_ORG: def(
    "IDENTITY",
    "Conflitto identità non risolvibile dal secondo account (merge/allineamento org).",
    409,
    "contact_org",
    { severity: "critical" },
  ),
  IDENTITY_CONFLICT_NEEDS_USER: def(
    "IDENTITY",
    "Conflitto identità risolvibile dall’utente (CF errato, account originale, ritiro).",
    409,
    "use_original_account",
  ),

  REGISTRATION_NOT_FOUND: def("REGISTRATION", "Nessuna Registration per il PlayerProfile della sessione.", 404, "request_new_invite"),
  REGISTRATION_WITHDRAWN: def("REGISTRATION", "Registration.status = WITHDRAWN.", 409, "contact_org"),
  REGISTRATION_WINDOW_CLOSED: def("REGISTRATION", "Finestra edizione chiusa o edizione non attiva.", 403, "wait"),
  REGISTRATION_STEP_NOT_REQUIRED: def("REGISTRATION", "Passo wizard non applicabile al profilo.", 400, "none", {
    severity: "info",
    retrySafe: true,
  }),
  REGISTRATION_IN_PROGRESS: def("REGISTRATION", "Iscrizione già in corso sul profilo corrente.", 409, "none", {
    severity: "info",
    retrySafe: true,
  }),
  REGISTRATION_COMPLETED: def("REGISTRATION", "Iscrizione già APPROVED.", 409, "none", { severity: "info" }),
  REGISTRATION_BLOCKED: def("REGISTRATION", "Iscrizione bloccata da conflitto identità persistito.", 409, "use_original_account"),
  REGISTRATION_DUPLICATE: def("REGISTRATION", "Unique (playerProfileId, editionId) violato.", 409, "contact_org"),

  INVITE_INVALID: def("INVITES", "Token hash sconosciuto o stato non PENDING riscattabile.", 400, "request_new_invite"),
  INVITE_EXPIRED: def("INVITES", "expiresAt superato o status EXPIRED.", 410, "request_new_invite"),
  INVITE_REVOKED: def("INVITES", "status REVOKED.", 410, "request_new_invite"),
  INVITE_ALREADY_USED: def("INVITES", "status ACCEPTED o race updateMany PENDING count=0.", 409, "login"),
  INVITE_LOGIN_REQUIRED: def("INVITES", "Email invito già User: niente nuovo account.", 409, "login"),
  INVITE_WRONG_SESSION: def("INVITES", "Sessione email ≠ email invito.", 403, "logout_retry_invite"),
  INVITE_EDITION_CONFLICT: def("INVITES", "Registration attiva su altra edizione/squadra (OD-017).", 409, "contact_org"),
  INVITE_ALREADY_ON_TEAM: def("INVITES", "Già membership/registration sul team dell’invito.", 409, "none", {
    severity: "info",
    retrySafe: true,
  }),
  INVITE_RATE_LIMITED: def("INVITES", "Rate limit create/redeem invito.", 429, "wait", { severity: "warning" }),
  INVITE_NOT_FOUND: def("INVITES", "Invite id non del team autorizzato.", 404, "none"),
  INVITE_TOKEN_MALFORMED: def("INVITES", "Token non well-formed.", 400, "correct_input"),
  STAFF_INVITE_INVALID: def("INVITES", "StaffInvite non riscattabile.", 400, "request_new_invite"),
  STAFF_INVITE_LOGIN_REQUIRED: def("INVITES", "Email staff già User, sessione assente.", 409, "login"),
  STAFF_INVITE_PASSWORD_REQUIRED: def("INVITES", "Create account staff senza password.", 400, "correct_input"),
  STAFF_INVITE_WRONG_SESSION: def("INVITES", "Sessione diversa dall’email staff invite.", 403, "logout_retry_invite"),
  STAFF_INVITE_LOGIN_FAILED: def("INVITES", "Staff creato ma signIn fallito.", 500, "login", {
    severity: "warning",
    retrySafe: true,
  }),

  DOCUMENT_INVALID_TYPE: def("DOCUMENTS", "MIME/magic non in allowlist PDF/JPEG/PNG.", 400, "correct_input", {
    retrySafe: true,
  }),
  DOCUMENT_TOO_LARGE: def("DOCUMENTS", "sizeBytes > DocumentType.maxSizeBytes.", 413, "correct_input", { retrySafe: true }),
  DOCUMENT_MISSING_FILE: def("DOCUMENTS", "Upload senza file quando serve un certificato.", 400, "correct_input", {
    retrySafe: true,
  }),
  DOCUMENT_SCAN_FAILED: def("DOCUMENTS", "Adapter scan ha rifiutato il file.", 400, "contact_org"),
  DOCUMENT_NOT_FOUND: def("DOCUMENTS", "Document id inesistente o non visibile (404 opaco).", 404, "none"),
  DOCUMENT_UPLOAD_RATE_LIMITED: def("DOCUMENTS", "Rate limit upload.", 429, "wait", { severity: "warning" }),
  DOCUMENT_REJECT_REASON_REQUIRED: def("DOCUMENTS", "Review REJECTED senza reason trim.", 400, "correct_input", {
    retrySafe: true,
  }),

  CONSENT_REQUIRED_UNCHECKED: def("CONSENTS", "Checkbox required non tutte confermate.", 400, "correct_input", {
    retrySafe: true,
  }),
  CONSENT_VERSION_STALE: def("CONSENTS", "legalDocumentVersionId non isCurrent.", 409, "retry", { retrySafe: true }),
  CONSENT_MEDIA_DECISION_REQUIRED: def("CONSENTS", "Né accept né refuse sulla liberatoria.", 400, "correct_input", {
    retrySafe: true,
  }),
  CONSENT_MEDIA_REQUIRED: def("CONSENTS", "Refuse su MEDIA_RELEASE required=true.", 400, "correct_input"),
  CONSENT_VERSION_MISSING: def("CONSENTS", "versionId assente nel form.", 400, "retry", { retrySafe: true }),
  CONSENT_RATE_LIMITED: def("CONSENTS", "Rate limit consensi.", 429, "wait", { severity: "warning" }),

  PAYMENT_ALREADY_COMPLETED: def("PAYMENTS", "Già SUCCEEDED utile (player o team). Secondo checkout bloccato.", 409, "none"),
  PAYMENT_IN_PROGRESS: def("PAYMENTS", "Esiste PENDING: si riusa, non si crea un secondo intent.", 409, "retry", {
    severity: "info",
    retrySafe: true,
  }),
  PAYMENT_TEAM_PAYS: def("PAYMENTS", "paymentMode TEAM: il giocatore non checkout.", 400, "none"),
  PAYMENT_PLAYER_PAYS: def("PAYMENTS", "paymentMode PLAYER: la squadra non checkout.", 400, "none"),
  PAYMENT_WEBHOOK_INVALID: def("PAYMENTS", "Firma/payload webhook invalidi.", 400, "none"),
  PAYMENT_WEBHOOK_UNKNOWN: def("PAYMENTS", "Evento senza Payment corrispondente.", 404, "none"),
  PAYMENT_WEBHOOK_DUPLICATE: def("PAYMENTS", "providerPaymentId già SUCCEEDED su altro Payment.", 409, "none", {
    severity: "warning",
  }),
  PAYMENT_WEBHOOK_CONFLICT: def("PAYMENTS", "updateMany 0 e stato corrente ≠ incoming.", 409, "none", { severity: "warning" }),
  PAYMENT_NOT_FOUND: def("PAYMENTS", "paymentId assente.", 404, "none"),

  TEAM_NOT_FOUND: def("TEAMS", "Team id inesistente dopo authz.", 404, "none"),
  TEAM_PLAYER_ALREADY_ON_TEAM: def("TEAMS", "inviteCreateBlocker already_on_team.", 409, "none", { severity: "info" }),
  TEAM_EDITION_CONFLICT: def("TEAMS", "inviteCreateBlocker edition_conflict.", 409, "none"),
  TEAM_BULK_RATE_LIMITED: def("TEAMS", "Rate limit CSV inviti.", 429, "wait", { severity: "warning" }),

  EDITION_NOT_FOUND: def("SYSTEM", "Edition id admin inesistente.", 404, "none"),
  GUARDIAN_SAVE_FAILED: def("REGISTRATION", "PlayerProfile assente in saveGuardian.", 500, "retry", { retrySafe: true }),

  VALIDATION_INVALID_INPUT: def("VALIDATION", "Zod safeParse fallito.", 400, "correct_input", {
    severity: "info",
    retrySafe: true,
  }),
  VALIDATION_BIRTH_DATE_INVALID: def("VALIDATION", "parseDateOnly ha rifiutato la data.", 400, "correct_input", {
    retrySafe: true,
  }),
  RATE_LIMITED: def("SYSTEM", "Rate limit generico (profilo/altro).", 429, "wait", { severity: "warning" }),
  RESOURCE_NOT_FOUND: def("SYSTEM", "Risorsa inesistente o non autorizzata (anti-enumerazione).", 404, "none"),
  SYSTEM_UNEXPECTED: def("SYSTEM", "Errore non classificato in boundary UI.", 500, "retry", {
    severity: "critical",
    retrySafe: true,
  }),

  LIFECYCLE_REMOVE_FORBIDDEN: def("LIFECYCLE", "team:remove_player denied (altra squadra o ruolo insufficiente).", 403, "none"),
  LIFECYCLE_REMOVE_NOT_PLAYER: def("LIFECYCLE", "Membership REPRESENTATIVE non rimuovibile con remove-player.", 403, "none"),
  LIFECYCLE_NOT_ON_TEAM: def("LIFECYCLE", "Membership assente sul team richiesto.", 404, "none"),
  LIFECYCLE_ACCOUNT_DELETED: def("LIFECYCLE", "User.lifecycleStatus = DELETED.", 410, "none"),
  LIFECYCLE_ACCOUNT_ANONYMIZED: def("LIFECYCLE", "User.lifecycleStatus = ANONYMIZED.", 410, "none"),
  LIFECYCLE_DELETE_FORBIDDEN: def("LIFECYCLE", "user:delete denied (non Super Admin).", 403, "none"),
  LIFECYCLE_ANONYMIZE_FORBIDDEN: def("LIFECYCLE", "user:anonymize denied (non Super Admin).", 403, "none"),
  LIFECYCLE_CANNOT_DELETE_SELF: def("LIFECYCLE", "Tentativo di chiudere l’account della sessione corrente.", 403, "none"),
  LIFECYCLE_CANNOT_ANONYMIZE_SELF: def("LIFECYCLE", "Tentativo di anonimizzare l’account della sessione corrente.", 403, "none"),
  LIFECYCLE_LAST_SUPER_ADMIN: def("LIFECYCLE", "Unico Super Admin ACTIVE: delete/anonymize bloccati.", 409, "none", {
    severity: "critical",
  }),
  LIFECYCLE_CONFIRM_MISMATCH: def("LIFECYCLE", "Parola o cognome di conferma non corrispondono.", 400, "correct_input", {
    retrySafe: true,
  }),
  LIFECYCLE_ALREADY_DELETED: def("LIFECYCLE", "Delete su account già DELETED.", 409, "none"),
  LIFECYCLE_ALREADY_ANONYMIZED: def("LIFECYCLE", "Anonymize su account già ANONYMIZED.", 409, "none"),
  LIFECYCLE_USER_NOT_FOUND: def("LIFECYCLE", "User id inesistente dopo authz super admin.", 404, "none"),
  LIFECYCLE_TARGET_NOT_ACTIVE: def("LIFECYCLE", "Remove-from-team su account non ACTIVE.", 409, "none"),
  LIFECYCLE_REGISTRATION_REMOVED: def("LIFECYCLE", "Registration.status = REMOVED: scritture wizard bloccate.", 409, "none"),
};

export const ERROR_CODE_LIST = Object.values(ERROR_CODES);

export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ERROR_CATALOG[code];
}

export function codesInCategory(category: ErrorCategory): ErrorCode[] {
  return ERROR_CODE_LIST.filter((code) => ERROR_CATALOG[code].category === category);
}
