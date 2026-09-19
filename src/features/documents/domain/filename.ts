export function sanitizeFilename(raw: string) {
  const base = raw.replace(/\\/g, "/").split("/").pop() ?? "file";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.slice(0, 80) || "file";
  return trimmed.startsWith(".") ? `file${trimmed}` : trimmed;
}

export async function stubScan(_input?: { body: Buffer; mimeType: string }) {
  void _input;
  return { ok: true as const };
}
