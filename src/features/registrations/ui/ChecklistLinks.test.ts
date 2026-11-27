import { describe, expect, it } from "vitest";
import { dashboardChecklistTone } from "./dashboardChecklist";

describe("dashboardChecklistTone", () => {
  it("marca arancio il passo tutore se manca l’altro genitore", () => {
    expect(dashboardChecklistTone({ code: "GUARDIAN_IF_MINOR", status: "complete" }, true)).toBe("attention");
  });

  it("non cambia gli altri passi durante l’attesa", () => {
    expect(dashboardChecklistTone({ code: "MEDICAL_CERT", status: "complete" }, true)).toBe("complete");
    expect(dashboardChecklistTone({ code: "MEDICAL_CERT", status: "attention" }, true)).toBe("attention");
  });

  it("lascia il tutore completo se non c’è attesa", () => {
    expect(dashboardChecklistTone({ code: "GUARDIAN_IF_MINOR", status: "complete" }, false)).toBe("complete");
  });
});
