type LogFields = Record<string, string | number | boolean | undefined>;

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "authorization",
  "cookie",
  "fiscalCode",
  "storageKey",
  "redeemUrl",
]);

function redact(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    clean[key] = REDACT_KEYS.has(key) ? "[redacted]" : value;
  }
  return clean;
}

export const logger = {
  info(message: string, fields?: LogFields) {
    console.info(JSON.stringify({ level: "info", message, ...redact(fields) }));
  },
  warn(message: string, fields?: LogFields) {
    console.warn(JSON.stringify({ level: "warn", message, ...redact(fields) }));
  },
  error(message: string, fields?: LogFields) {
    console.error(JSON.stringify({ level: "error", message, ...redact(fields) }));
  },
};
