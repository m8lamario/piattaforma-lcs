export function detectAllowedMime(body: Buffer) {
  if (body.length >= 4 && body.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf" as const;
  }
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return "image/jpeg" as const;
  }
  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47 &&
    body[4] === 0x0d &&
    body[5] === 0x0a &&
    body[6] === 0x1a &&
    body[7] === 0x0a
  ) {
    return "image/png" as const;
  }
  return null;
}

export function declaredMimeMatches(detected: string, declared: string) {
  const normalized = declared.toLowerCase().split(";")[0]?.trim();
  if (!normalized || normalized === "application/octet-stream") {
    return true;
  }
  if (detected === "image/jpeg") {
    return normalized === "image/jpeg" || normalized === "image/jpg";
  }
  return normalized === detected;
}
