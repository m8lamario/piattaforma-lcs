import { describe, expect, it } from "vitest";
import { displayNameFromEmail, namesFromEmail } from "./emailName";

describe("namesFromEmail", () => {
  it("divide nome e cognome su punto, underscore o trattino", () => {
    expect(namesFromEmail("mario.m8la@gmail.com")).toEqual({ firstName: "Mario", lastName: "M8la" });
    expect(namesFromEmail("anna_rossi@example.test")).toEqual({ firstName: "Anna", lastName: "Rossi" });
    expect(namesFromEmail("luca-bianchi@example.test")).toEqual({ firstName: "Luca", lastName: "Bianchi" });
  });

  it("ignora il tag dopo il più nell’indirizzo", () => {
    expect(namesFromEmail("mario.m8la+news@gmail.com")).toEqual({ firstName: "Mario", lastName: "M8la" });
  });

  it("usa un solo segmento come nome e un segnaposto per il cognome", () => {
    expect(namesFromEmail("mario@gmail.com")).toEqual({ firstName: "Mario", lastName: "—" });
  });

  it("compone il nome visualizzato dell’account", () => {
    expect(displayNameFromEmail("mario.m8la@gmail.com")).toBe("Mario M8la");
    expect(displayNameFromEmail("mario@gmail.com")).toBe("Mario");
  });
});
