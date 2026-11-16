import type { CertificateExtractResult, CertificateInspector } from "../types";

function isPdf(mimeType: string) {
  return mimeType === "application/pdf";
}

function isImage(mimeType: string) {
  return mimeType === "image/jpeg" || mimeType === "image/png";
}

function decodePdfLiteral(raw: string) {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct: string) => String.fromCharCode(Number.parseInt(oct, 8)));
}

/** Fallback locale: stringhe letterali in un PDF non compresso. Non è OCR. */
export function extractLiteralPdfStrings(body: Buffer) {
  const source = body.toString("latin1");
  const pieces: string[] = [];
  const literals = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  for (const match of source.matchAll(literals)) {
    if (match[1]) pieces.push(decodePdfLiteral(match[1]));
  }
  const arrays = /\[([^\]]+)\]\s*TJ/g;
  for (const match of source.matchAll(arrays)) {
    const inner = match[1] ?? "";
    for (const piece of inner.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
      if (piece[1]) pieces.push(decodePdfLiteral(piece[1]));
    }
  }
  const text = pieces.join(" ").replace(/\s+/g, " ").trim();
  return text || null;
}

async function extractPdfTextLayer(body: Buffer) {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(body));
    const result = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    const text = raw?.replace(/\s+/g, " ").trim() ?? "";
    if (text) return text;
  } catch {
    // resta il fallback locale; nessun contenuto del certificato nei log
  }
  return extractLiteralPdfStrings(body);
}

export const localCertificateInspector: CertificateInspector = {
  driver: "local",
  async extractText(input): Promise<CertificateExtractResult> {
    if (isImage(input.mimeType)) {
      return { adapter: "local-image", reason: "image", text: null };
    }
    if (!isPdf(input.mimeType)) {
      return { adapter: "local", reason: "unreadable", text: null };
    }
    try {
      const text = await extractPdfTextLayer(input.body);
      if (!text) return { adapter: "local-pdf", reason: "unreadable", text: null };
      return { adapter: "local-pdf", reason: "text", text };
    } catch {
      return { adapter: "local-pdf", reason: "failed", text: null };
    }
  },
};
