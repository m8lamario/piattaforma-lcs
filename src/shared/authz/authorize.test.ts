import { describe, expect, it } from "vitest";
import { authorize } from "./authorize";
import type { Actor } from "./types";

const player: Actor = {
  userId: "player-1",
  roles: [{ role: "PLAYER" }],
  membershipTeamIds: ["team-1"],
};

const otherPlayer: Actor = {
  userId: "player-2",
  roles: [{ role: "PLAYER" }],
  membershipTeamIds: ["team-1"],
};

const rep: Actor = {
  userId: "rep-1",
  roles: [{ role: "TEAM_REPRESENTATIVE", teamId: "team-1" }],
  membershipTeamIds: ["team-1"],
};

const otherRep: Actor = {
  userId: "rep-2",
  roles: [{ role: "TEAM_REPRESENTATIVE", teamId: "team-2" }],
  membershipTeamIds: ["team-2"],
};

const orgAdmin: Actor = {
  userId: "admin-1",
  roles: [{ role: "ORGANIZATION_ADMIN" }],
  membershipTeamIds: [],
};

const superAdmin: Actor = {
  userId: "root-1",
  roles: [{ role: "SUPER_ADMIN" }],
  membershipTeamIds: [],
};

const ownDoc = { ownerUserId: "player-1", teamId: "team-1" };

describe("authorize deny-by-default", () => {
  it("nega di default un'azione admin al giocatore", () => {
    expect(authorize(player, "document:review", ownDoc).allow).toBe(false);
  });

  it("impedisce a un giocatore di leggere la registrazione di un altro", () => {
    const decision = authorize(otherPlayer, "registration:read", ownDoc);
    expect(decision.allow).toBe(false);
  });

  it("consente al giocatore di leggere il proprio file documento", () => {
    expect(authorize(player, "document:read_file", ownDoc).allow).toBe(true);
  });

  it("consente al rappresentante lo stato ma non il file medico", () => {
    expect(authorize(rep, "document:read_status", ownDoc).allow).toBe(true);
    expect(authorize(rep, "document:read_file", ownDoc).allow).toBe(false);
  });

  it("nega al rappresentante di un'altra squadra lo stato documento", () => {
    expect(authorize(otherRep, "document:read_status", ownDoc).allow).toBe(false);
  });

  it("consente all'org admin la review ma non platform:admin", () => {
    expect(authorize(orgAdmin, "document:review", ownDoc).allow).toBe(true);
    expect(authorize(orgAdmin, "platform:admin").allow).toBe(false);
  });

  it("nega al giocatore di scrivere la registrazione di un altro", () => {
    expect(authorize(otherPlayer, "registration:write", ownDoc).allow).toBe(false);
    expect(authorize(player, "registration:write", ownDoc).allow).toBe(true);
  });

  it("nega al giocatore l'invito in squadra", () => {
    expect(authorize(player, "team:invite", { teamId: "team-1" }).allow).toBe(false);
  });

  it("nega al rappresentante di un'altra squadra l'invito", () => {
    expect(authorize(otherRep, "team:invite", { teamId: "team-1" }).allow).toBe(false);
  });

  it("consente al super admin ogni azione", () => {
    expect(authorize(superAdmin, "platform:admin").allow).toBe(true);
    expect(authorize(superAdmin, "document:read_file", ownDoc).allow).toBe(true);
  });

  it("nega al giocatore ritiro e maglia altrui, consente il proprio ritiro", () => {
    expect(authorize(player, "registration:withdraw", ownDoc).allow).toBe(true);
    expect(authorize(otherPlayer, "registration:withdraw", ownDoc).allow).toBe(false);
    expect(authorize(orgAdmin, "registration:withdraw", ownDoc).allow).toBe(true);
    expect(authorize(player, "team:update_roster", { teamId: "team-1" }).allow).toBe(false);
    expect(authorize(rep, "team:update_roster", { teamId: "team-1" }).allow).toBe(true);
    expect(authorize(player, "staff:invite", { teamId: "team-1" }).allow).toBe(false);
    expect(authorize(orgAdmin, "staff:invite", { teamId: "team-1" }).allow).toBe(true);
  });

  it("nega player e rappresentante sulla console organizzazione", () => {
    expect(authorize(player, "admin:manage").allow).toBe(false);
    expect(authorize(rep, "admin:manage").allow).toBe(false);
    expect(authorize(orgAdmin, "admin:manage").allow).toBe(true);
  });
});
