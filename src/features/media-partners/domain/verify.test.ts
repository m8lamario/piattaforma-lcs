import { describe, expect, it } from "vitest";
import {
  dtoLeaksForbiddenFields,
  mediaCardWhere,
  mediaSearchWhere,
  summarizeMediaAuthorization,
  type MediaPlayerCard,
} from "./verify";

const VERSION = "ver-1";

function choice(
  code: string,
  accepted: boolean,
  createdAt: number,
  legalDocumentVersionId: string | null = VERSION,
) {
  return { code, accepted, createdAt, legalDocumentVersionId };
}

describe("stati di lettura delle liberatorie", () => {
  it("accorda i canali adulto se l’ultima scelta è sì e ha versione", () => {
    const summary = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [
        choice("M7", true, 1),
        choice("M8", false, 1),
        choice("M9", true, 1),
        choice("M10", false, 1),
        choice("M11", false, 1),
      ],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(summary.ageBand).toBe("adult");
    expect(summary.uses.find((use) => use.key === "channels")?.state).toBe("granted");
    expect(summary.uses.find((use) => use.key === "promotion")?.state).toBe("denied");
    expect(summary.uses.find((use) => use.key === "sponsor")?.state).toBe("granted");
    expect(summary.photoVideo.state).toBe("granted");
    expect(summary.social.state).toBe("granted");
  });

  it("non considera un consenso mancante come autorizzazione", () => {
    const summary = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(summary.uses.every((use) => use.state === "not_collected")).toBe(true);
    expect(summary.photoVideo.state).toBe("not_collected");
    expect(summary.social.state).toBe("not_collected");
  });

  it("distingue negato e revocato", () => {
    const denied = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [choice("M7", false, 1)],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    const revoked = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [choice("M7", true, 1), choice("M7", false, 2)],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(denied.social.state).toBe("denied");
    expect(revoked.social.state).toBe("revoked");
    expect(revoked.photoVideo.state).toBe("revoked");
  });

  it("non rende efficace il minore in attesa di C1 o senza G14", () => {
    const pending = summarizeMediaAuthorization({
      birthDate: new Date("2011-01-01T00:00:00.000Z"),
      choices: [
        choice("G1", true, 1),
        { code: "G3", accepted: true, createdAt: 1, legalDocumentVersionId: VERSION, value: "OTHER_PARENT" },
        choice("G9", true, 1),
        choice("G14", true, 1),
      ],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    const withoutG14 = summarizeMediaAuthorization({
      birthDate: new Date("2011-01-01T00:00:00.000Z"),
      choices: [
        choice("G1", true, 1),
        { code: "G3", accepted: true, createdAt: 1, legalDocumentVersionId: VERSION, value: "OTHER_PARENT" },
        choice("C1", true, 1),
        choice("G9", true, 1),
      ],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(pending.social.state).toBe("not_effective");
    expect(pending.social.reason).toBe("pending_other_parent");
    expect(withoutG14.social.state).toBe("not_effective");
    expect(withoutG14.social.reason).toBe("missing_g14");
    expect(pending.photoVideo.state).toBe("not_effective");
  });

  it("marca non verificabile nascita assente, versione assente o pubblicazione revocata", () => {
    const noBirth = summarizeMediaAuthorization({
      birthDate: null,
      choices: [choice("M7", true, 1)],
    });
    const noVersion = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [choice("M7", true, 1, null)],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    const revokedPublication = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [choice("M7", true, 1)],
      publicationAuthorizationStatus: "REVOKED",
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(noBirth.ageBand).toBe("unverifiable");
    expect(noBirth.photoVideo.state).toBe("unverifiable");
    expect(noBirth.social.state).toBe("unverifiable");
    expect(noVersion.social.state).toBe("unverifiable");
    expect(noVersion.social.reason).toBe("missing_version");
    expect(revokedPublication.social.state).toBe("unverifiable");
    expect(revokedPublication.social.reason).toBe("publication_revoked");
  });

  it("non accende il social se è accordata solo la stampa", () => {
    const summary = summarizeMediaAuthorization({
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      choices: [choice("M10", true, 1)],
      now: new Date("2026-10-19T00:00:00.000Z"),
    });
    expect(summary.uses.find((use) => use.key === "press")?.state).toBe("granted");
    expect(summary.photoVideo.state).toBe("granted");
    expect(summary.social.state).toBe("not_collected");
  });
});

describe("isolamento della query media partner", () => {
  it("mette le competizioni autorizzate nel where e rifiuta query troppo corte", () => {
    expect(mediaSearchWhere({ query: "a", competitionIds: ["cup-a"] })).toBeNull();
    expect(mediaSearchWhere({ query: "Rossi", competitionIds: [] })).toBeNull();
    const where = mediaSearchWhere({ query: "Mario Rossi", competitionIds: ["cup-a"] });
    expect(where).toMatchObject({
      status: { notIn: ["WITHDRAWN", "REMOVED"] },
      edition: { competitionId: { in: ["cup-a"] } },
      playerProfile: { user: { lifecycleStatus: "ACTIVE" } },
    });
    expect(where?.playerProfile.AND).toHaveLength(2);

    const all = mediaSearchWhere({ query: "Rossi", competitionIds: "all" });
    expect(all).not.toHaveProperty("edition");

    const card = mediaCardWhere({ registrationId: "reg-1", competitionIds: ["cup-a"] });
    expect(card).toMatchObject({
      id: "reg-1",
      edition: { competitionId: { in: ["cup-a"] } },
    });
    expect(mediaCardWhere({ registrationId: "reg-1", competitionIds: [] })).toBeNull();
  });

  it("il DTO della scheda non espone campi vietati", () => {
    const card: MediaPlayerCard = {
      registrationId: "reg-1",
      firstName: "Mario",
      lastName: "Rossi",
      teamName: "Liceo",
      competitionName: "Mole Cup",
      editionName: "2026",
      category: "PLAYER",
      ageBand: "adult",
      photoVideo: { key: "channels", state: "granted", reason: null },
      social: { key: "channels", state: "granted", reason: null },
      uses: [{ key: "channels", state: "granted", reason: null }],
      unverifiable: false,
    };
    expect(dtoLeaksForbiddenFields(card)).toEqual([]);
  });
});
