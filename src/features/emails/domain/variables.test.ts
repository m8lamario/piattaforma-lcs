import { describe, expect, it } from "vitest";
import {
  interpolateTemplate,
  invalidTemplateVariables,
  pickEmailVariables,
  redactSecretVariables,
} from "./variables";

describe("variabili template email", () => {
  it("interpola solo chiavi ammesse", () => {
    const text = interpolateTemplate("Ciao {{nome}} {{fiscalCode}} {{unknown}}", {
      nome: "Luca",
      fiscalCode: "RSSMRA80A01H501U",
      unknown: "x",
    });
    expect(text).toBe("Ciao Luca  ");
  });

  it("rifiuta variabili vietate in un override", () => {
    expect(invalidTemplateVariables("Motivo: {{reason}} {{nome}}")).toEqual(["reason"]);
  });

  it("copia nome_squadra da teamName e link da areaUrl", () => {
    const vars = pickEmailVariables({ teamName: "Alpha", areaUrl: "https://hub.test/area" });
    expect(vars.nome_squadra).toBe("Alpha");
    expect(vars.link).toBe("https://hub.test/area");
  });

  it("redige URL con token nello snapshot persistito", () => {
    const resetUrl = "https://hub.test/recupera-password/secret-token";
    const body = `Apri: ${resetUrl}`;
    expect(redactSecretVariables(body, { resetUrl })).toBe("Apri: [link omesso]");
    expect(redactSecretVariables(body, { resetUrl })).not.toContain("secret-token");
  });

  it("omette il codice di verifica dallo snapshot persistito", () => {
    const body = "Codice: 482913";
    expect(redactSecretVariables(body, { codice: "482913" })).toBe("Codice: [codice omesso]");
  });
});
