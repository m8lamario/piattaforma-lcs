import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("job promemoria certificati", () => {
  it("rifiuta le chiamate senza il segreto", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/api/jobs/medical-deadline/route.ts"), "utf8");
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain('status: 401');
    expect(source).toContain("Bearer");
  });
});
