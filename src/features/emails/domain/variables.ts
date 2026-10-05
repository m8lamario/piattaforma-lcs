export const EMAIL_VARIABLE_KEYS = [
  "nome",
  "cognome",
  "email",
  "nome_squadra",
  "link",
  "scadenza",
  "areaUrl",
  "documents",
  "title",
  "playerName",
  "summary",
  "teamName",
  "body",
  "firstName",
  "lastName",
  "redeemUrl",
  "resetUrl",
  "confirmUrl",
] as const;

export type EmailVariableKey = (typeof EMAIL_VARIABLE_KEYS)[number];

export const EMAIL_VARIABLE_KEY_SET = new Set<string>(EMAIL_VARIABLE_KEYS);

export const SECRET_EMAIL_VARIABLE_KEYS = ["redeemUrl", "resetUrl", "confirmUrl"] as const;

const FORBIDDEN_VARIABLE_KEYS = new Set([
  "fiscalCode",
  "codiceFiscale",
  "token",
  "password",
  "storageKey",
  "reason",
  "motivo",
]);

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function isAllowedEmailVariable(key: string) {
  return EMAIL_VARIABLE_KEY_SET.has(key) && !FORBIDDEN_VARIABLE_KEYS.has(key);
}

export function pickEmailVariables(input: Record<string, string | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of EMAIL_VARIABLE_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  if (!out.link) {
    out.link = out.areaUrl || out.redeemUrl || out.resetUrl || out.confirmUrl || "";
  }
  if (!out.link) delete out.link;
  if (!out.nome && out.firstName) out.nome = out.firstName;
  if (!out.cognome && out.lastName) out.cognome = out.lastName;
  if (!out.nome_squadra && out.teamName) out.nome_squadra = out.teamName;
  if (!out.link) {
    out.link = out.areaUrl || out.redeemUrl || out.resetUrl || out.confirmUrl || "";
  }
  return out;
}

export function interpolateTemplate(source: string, variables: Record<string, string>) {
  return source.replace(PLACEHOLDER, (_match, key: string) => {
    if (!isAllowedEmailVariable(key)) return "";
    return variables[key] ?? "";
  });
}

export function listTemplateVariables(source: string) {
  const keys = new Set<string>();
  for (const match of source.matchAll(PLACEHOLDER)) {
    if (match[1]) keys.add(match[1]);
  }
  return [...keys];
}

export function invalidTemplateVariables(source: string) {
  return listTemplateVariables(source).filter((key) => !isAllowedEmailVariable(key));
}

export function redactSecretVariables(
  text: string,
  variables: Record<string, string>,
  replacement = "[link omesso]",
) {
  let next = text;
  for (const key of SECRET_EMAIL_VARIABLE_KEYS) {
    const value = variables[key];
    if (value) next = next.split(value).join(replacement);
  }
  return next;
}
