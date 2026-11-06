const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Scritture che non modificano dati di un utente. Servono a tenere vivi audit e rate limit delle letture. */
const WRITE_ALLOWLIST = new Set(["AuditLog.create", "RateLimitHit.create"]);

export function isBlockedWrite(input: { viewActive: boolean; model: string; operation: string }) {
  if (!input.viewActive) return false;
  if (READ_OPERATIONS.has(input.operation)) return false;
  if (WRITE_ALLOWLIST.has(`${input.model}.${input.operation}`)) return false;
  return true;
}
