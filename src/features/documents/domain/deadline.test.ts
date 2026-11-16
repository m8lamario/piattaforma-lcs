import { describe, expect, it } from "vitest";
import { it as copy } from "@/shared/i18n/it";

describe("promemoria certificato medico", () => {
  it("il testo non contiene il motivo del rifiuto", () => {
    const blob = [
      copy.notifyMedicalDeadlineTitle,
      copy.notifyMedicalDeadlineBody,
      copy.notifyMedicalDeadlineBodyCOMPETITIVE,
      copy.notifyMedicalDeadlineBodyNON_COMPETITIVE,
      copy.notifyMedicalDeadlineRepTitle,
      copy.notifyMedicalDeadlineRepBody,
      copy.emailMedicalDeadlineSubject,
      copy.emailMedicalDeadlineText,
      copy.emailMedicalDeadlineIntro,
    ].join(" ");
    expect(blob.toLowerCase()).not.toContain("motivo");
    expect(blob.toLowerCase()).not.toContain("diagnosi");
    expect(blob.toLowerCase()).not.toContain("rifiut");
  });
});
