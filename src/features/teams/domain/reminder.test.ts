import { describe, expect, it } from "vitest";
import { registrationReminder } from "./reminder";

describe("registrationReminder", () => {
  it("elenca i passi senza motivo di review medica", () => {
    const message = registrationReminder(["PERSONAL_DATA", "MEDICAL_CERT"]);
    expect(message.type).toBe("REGISTRATION_REMINDER");
    expect(message.body).toContain("dati");
    expect(message.body).toContain("certificato");
    expect(message.body.toLowerCase()).not.toContain("reason");
    expect(JSON.stringify(message)).not.toMatch(/rifiut/i);
  });
});
