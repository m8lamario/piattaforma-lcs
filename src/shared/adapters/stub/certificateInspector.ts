import type { CertificateExtractResult, CertificateInspector } from "../types";

export const stubCertificateInspector: CertificateInspector = {
  driver: "stub",
  async extractText(): Promise<CertificateExtractResult> {
    return { adapter: "stub", reason: "unreadable", text: null };
  },
};
