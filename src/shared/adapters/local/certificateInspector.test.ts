import { describe, expect, it } from "vitest";
import { extractLiteralPdfStrings, localCertificateInspector } from "./certificateInspector";

function uncompressedPdf(text: string) {
  const stream = `BT /F1 12 Tf 10 100 Td (${text}) Tj ET`;
  return Buffer.from(
    `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${stream.length} >>stream
${stream}
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
trailer<< /Root 1 0 R >>
%%EOF
`,
    "latin1",
  );
}

describe("ispettore locale certificati", () => {
  it("estrae stringhe letterali da un PDF non compresso", () => {
    const body = uncompressedPdf("Mario Rossi idoneita sportiva agonistica");
    expect(extractLiteralPdfStrings(body)).toContain("Mario Rossi");
  });

  it("un PDF senza text layer è illeggibile", async () => {
    const result = await localCertificateInspector.extractText({
      mimeType: "application/pdf",
      body: Buffer.from("%PDF-1.1 empty"),
    });
    expect(result.reason).toBe("unreadable");
    expect(result.text).toBeNull();
  });

  it("non classifica le immagini: restano in coda manuale", async () => {
    const result = await localCertificateInspector.extractText({
      mimeType: "image/jpeg",
      body: Buffer.from([0xff, 0xd8, 0xff]),
    });
    expect(result.reason).toBe("image");
    expect(result.text).toBeNull();
  });
});
