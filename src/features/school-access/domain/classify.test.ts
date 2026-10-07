import { describe, expect, it } from "vitest";
import { schoolAccessRequestSchema } from "@/features/school-access/schemas/request";
import {
  classifySchoolAccessRequest,
  isPlatformAdminRole,
  representativeProvisionRoles,
  type SchoolAccessFacts,
} from "./classify";
import { schoolNameKey, schoolsMatch } from "./normalize";

const clear: SchoolAccessFacts = {
  emailHasAccount: false,
  schoolAlreadyOnEdition: false,
  pendingSameEmail: false,
  pendingSameSchoolEdition: false,
  approvedUnactivatedSameEmail: false,
  approvedUnactivatedSameSchoolEdition: false,
};

describe("classificazione richiesta accesso scuola", () => {
  it("accetta una richiesta senza conflitti", () => {
    expect(classifySchoolAccessRequest(clear)).toEqual({ ok: true });
  });

  it("blocca un’email già associata a un account", () => {
    expect(classifySchoolAccessRequest({ ...clear, emailHasAccount: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_EMAIL_TAKEN",
    });
  });

  it("blocca una scuola già registrata sull’edizione", () => {
    expect(classifySchoolAccessRequest({ ...clear, schoolAlreadyOnEdition: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_SCHOOL_EXISTS",
    });
  });

  it("blocca una richiesta già approvata non ancora attivata", () => {
    expect(classifySchoolAccessRequest({ ...clear, approvedUnactivatedSameEmail: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_ALREADY_APPROVED",
    });
    expect(classifySchoolAccessRequest({ ...clear, approvedUnactivatedSameSchoolEdition: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_ALREADY_APPROVED",
    });
  });

  it("blocca una richiesta duplicata in attesa", () => {
    expect(classifySchoolAccessRequest({ ...clear, pendingSameEmail: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_DUPLICATE",
    });
    expect(classifySchoolAccessRequest({ ...clear, pendingSameSchoolEdition: true })).toEqual({
      ok: false,
      code: "SCHOOL_ACCESS_DUPLICATE",
    });
  });

  it("antepone l’email già usata al duplicato", () => {
    expect(
      classifySchoolAccessRequest({ ...clear, emailHasAccount: true, pendingSameEmail: true }),
    ).toEqual({ ok: false, code: "SCHOOL_ACCESS_EMAIL_TAKEN" });
  });
});

describe("normalizzazione scuola", () => {
  it("collassa spazi e ignora il maiuscolo", () => {
    expect(schoolNameKey("  Liceo   Manzoni ")).toBe("liceo manzoni");
    expect(
      schoolsMatch({ name: "Liceo  Manzoni", city: "Milano" }, { name: "liceo manzoni", city: " milano " }),
    ).toBe(true);
    expect(
      schoolsMatch({ name: "Liceo Manzoni", city: "Milano" }, { name: "Liceo Manzoni", city: "Roma" }),
    ).toBe(false);
  });
});

describe("ruoli in approvazione", () => {
  it("assegna solo TEAM_REPRESENTATIVE, mai privilegi di piattaforma", () => {
    const roles = representativeProvisionRoles();
    expect(roles.userRole).toBe("TEAM_REPRESENTATIVE");
    expect(roles.membershipRole).toBe("REPRESENTATIVE");
    expect(isPlatformAdminRole(roles.userRole)).toBe(false);
    expect(isPlatformAdminRole("ORGANIZATION_ADMIN")).toBe(true);
    expect(isPlatformAdminRole("SUPER_ADMIN")).toBe(true);
  });
});

describe("validazione form richiesta accesso", () => {
  const valid = {
    firstName: "Anna",
    lastName: "Bianchi",
    email: "anna@scuola.it",
    phone: "3471234567",
    schoolName: "Liceo Manzoni",
    city: "Milano",
    requesterRole: "INSTITUTE_REPRESENTATIVE" as const,
    institutionalEmail: "",
    editionId: "edition-1",
  };

  it("accetta una richiesta valida e normalizza email e telefono", () => {
    const parsed = schoolAccessRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("anna@scuola.it");
      expect(parsed.data.phone).toBe("3471234567");
    }
  });

  it("rifiuta dati incompleti o non validi", () => {
    expect(schoolAccessRequestSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, email: "non-un-email" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, schoolName: "A" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, requesterRole: "ADMIN" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, editionId: "" }).success).toBe(false);
    expect(schoolAccessRequestSchema.safeParse({ ...valid, institutionalEmail: "nope" }).success).toBe(false);
  });
});
