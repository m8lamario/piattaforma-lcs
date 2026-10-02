import { describe, expect, it } from "vitest";
import {
  latestChoices,
  marketingConfirmed,
  mediaActivation,
  mediaBoxesRecorded,
  privacyBoxesComplete,
  privacyExtraBoxes,
  publicationFlags,
  requiredPrivacyBoxes,
  type ChoiceSnapshot,
} from "./boxes";

function mapOf(rows: Array<Partial<ChoiceSnapshot> & { code: string; accepted: boolean }>) {
  return latestChoices(
    rows.map((row, index) => ({
      code: row.code,
      accepted: row.accepted,
      value: row.value,
      createdAt: row.createdAt ?? index + 1,
    })),
  );
}

describe("caselle LCS 2026-27", () => {
  it("chiede T1, M1, M2, M3 all’adulto e non le caselle immagini", () => {
    expect(requiredPrivacyBoxes(false, false).map((box) => box.code)).toEqual(["T1", "M1", "M2", "M3"]);
  });

  it("completa la privacy adulto solo con le caselle obbligatorie e salute", () => {
    expect(
      privacyBoxesComplete(
        false,
        false,
        mapOf([
          { code: "T1", accepted: true },
          { code: "M1", accepted: true },
          { code: "M2", accepted: true },
          { code: "M3", accepted: true },
        ]),
      ),
    ).toBe(true);
    expect(
      privacyBoxesComplete(
        false,
        false,
        mapOf([
          { code: "T1", accepted: true },
          { code: "M1", accepted: true },
          { code: "M2", accepted: true },
        ]),
      ),
    ).toBe(false);
  });

  it("non attiva le foto del minore senza C1, anche se G9 è spuntata", () => {
    const map = mapOf([
      { code: "G3", accepted: true, value: "OTHER_PARENT" },
      { code: "G9", accepted: true },
      { code: "G14", accepted: true },
    ]);
    expect(mediaActivation({ isMinor: true, needsAgreement: true, map })).toBe(false);
    expect(publicationFlags({ isMinor: true, needsAgreement: true, map }).status).toBe("pending_other_parent");
    expect(publicationFlags({ isMinor: true, needsAgreement: true, map }).channels).toBe(false);
  });

  it("attiva G5 e G9 dopo C1 e G14 dai 14 anni", () => {
    const map = mapOf([
      { code: "G3", accepted: true, value: "OTHER_PARENT" },
      { code: "G5", accepted: true },
      { code: "G9", accepted: true },
      { code: "G14", accepted: true },
      { code: "C1", accepted: true },
    ]);
    expect(mediaActivation({ isMinor: true, needsAgreement: true, map })).toBe(true);
    const flags = publicationFlags({ isMinor: true, needsAgreement: true, map });
    expect(flags.status).toBe("publishable");
    expect(flags.fullSurname).toBe(true);
    expect(flags.channels).toBe(true);
  });

  it("sotto i 14 anni non richiede G14 dopo C1", () => {
    const map = mapOf([
      { code: "G3", accepted: true, value: "OTHER_PARENT" },
      { code: "G9", accepted: true },
      { code: "C1", accepted: true },
    ]);
    expect(mediaActivation({ isMinor: true, needsAgreement: false, map })).toBe(true);
    expect(publicationFlags({ isMinor: true, needsAgreement: false, map }).channels).toBe(true);
  });

  it("con unico esercente attiva subito, senza C1", () => {
    const map = mapOf([
      { code: "G3", accepted: true, value: "SOLE" },
      { code: "G9", accepted: true },
      { code: "G14", accepted: true },
    ]);
    expect(publicationFlags({ isMinor: true, needsAgreement: true, map }).status).toBe("publishable");
  });

  it("tiene i sotto-flag immagini distinti dal flag canali", () => {
    const map = mapOf([
      { code: "M7", accepted: true },
      { code: "M8", accepted: false },
      { code: "M9", accepted: true },
    ]);
    const flags = publicationFlags({ isMinor: false, needsAgreement: false, map });
    expect(flags.status).toBe("publishable");
    expect(flags.channels).toBe(true);
    expect(flags.promotion).toBe(false);
    expect(flags.sponsor).toBe(true);
  });

  it("considera il passo liberatorie compilato anche con tutte le caselle false", () => {
    const map = mapOf([
      { code: "M7", accepted: false },
      { code: "M8", accepted: false },
      { code: "M9", accepted: false },
      { code: "M10", accepted: false },
      { code: "M11", accepted: false },
    ]);
    expect(mediaBoxesRecorded(false, map)).toBe(true);
    expect(publicationFlags({ isMinor: false, needsAgreement: false, map }).status).toBe("not_publishable");
  });

  it("tiene M1 e M3 come extra, non T1/M2", () => {
    expect(privacyExtraBoxes(false, false).map((box) => box.code)).toEqual(["M1", "M3", "M4", "M6"]);
    expect(privacyExtraBoxes(false, true).map((box) => box.code)).toContain("M5");
  });

  it("attiva il marketing solo dopo il clic sull’email", () => {
    const map = mapOf([{ code: "M4", accepted: true, createdAt: 10 }]);
    expect(marketingConfirmed(map, [{ usedAt: 9 }])).toBe(false);
    expect(marketingConfirmed(map, [{ usedAt: 11 }])).toBe(true);
  });
});
