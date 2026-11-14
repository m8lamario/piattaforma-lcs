import { describe, expect, it } from "vitest";
import {
  decideUserEmailResend,
  isUserEmailResendKey,
  projectPasswordResetAttempts,
  projectUserEmailDelivery,
  remainingUserEmailResends,
  userEmailDeliveryState,
  userEmailResendIdempotencyKey,
} from "./delivery";

const queuedAt = new Date("2026-11-13T10:00:00Z");

describe("stato di consegna utente", () => {
  it("distingue queued fresco, queued stale, accettato, consegnato, bounce e errore", () => {
    expect(userEmailDeliveryState(null)).toBe("not_sent");
    expect(userEmailDeliveryState({ status: "QUEUED", queuedAt }, new Date("2026-11-13T10:00:10Z"))).toBe("sending");
    expect(userEmailDeliveryState({ status: "QUEUED", queuedAt }, new Date("2026-11-13T10:01:00Z"))).toBe("not_sent");
    expect(userEmailDeliveryState({ status: "SENT", queuedAt })).toBe("accepted");
    expect(userEmailDeliveryState({ status: "DELIVERY_DELAYED", queuedAt })).toBe("accepted");
    expect(userEmailDeliveryState({ status: "DELIVERED", queuedAt })).toBe("delivered");
    expect(userEmailDeliveryState({ status: "BOUNCED", queuedAt })).toBe("undeliverable");
    expect(userEmailDeliveryState({ status: "FAILED", queuedAt })).toBe("technical_error");
    expect(userEmailDeliveryState({ status: "COMPLAINED", queuedAt })).toBe("technical_error");
  });

  it("non chiama accepted consegnata", () => {
    expect(userEmailDeliveryState({ status: "SENT", queuedAt })).not.toBe("delivered");
  });
});

describe("tetto reinvii", () => {
  it("conta solo i reinvii utente oltre il primo invio", () => {
    expect(remainingUserEmailResends(0)).toBe(3);
    expect(remainingUserEmailResends(1)).toBe(2);
    expect(remainingUserEmailResends(3)).toBe(0);
    expect(remainingUserEmailResends(4)).toBe(0);
  });

  it("rifiuta il quarto reinvio", () => {
    const decision = decideUserEmailResend({
      userResendCount: 3,
      lastState: "accepted",
      lastQueuedAt: queuedAt,
      now: new Date("2026-11-13T12:00:00Z"),
    });
    expect(decision).toEqual({ allow: false, reason: "exhausted" });
  });

  it("rispetta il cooldown", () => {
    const decision = decideUserEmailResend({
      userResendCount: 0,
      lastState: "accepted",
      lastQueuedAt: queuedAt,
      now: new Date("2026-11-13T10:00:30Z"),
    });
    expect(decision).toEqual({ allow: false, reason: "cooldown" });
  });

  it("blocca il reinvio allo stesso indirizzo dopo un bounce", () => {
    const decision = decideUserEmailResend({
      userResendCount: 0,
      lastState: "undeliverable",
      lastQueuedAt: queuedAt,
      now: new Date("2026-11-13T12:00:00Z"),
    });
    expect(decision).toEqual({ allow: false, reason: "undeliverable" });
  });

  it("non mescola il conteggio di due indirizzi", () => {
    const first = projectUserEmailDelivery({
      rows: [
        { status: "SENT", queuedAt, idempotencyKey: "email-verify:u1:a" },
        {
          status: "SENT",
          queuedAt: new Date("2026-11-13T10:05:00Z"),
          idempotencyKey: userEmailResendIdempotencyKey("email-verify:u1:b"),
        },
      ],
      now: new Date("2026-11-13T12:00:00Z"),
    });
    const corrected = projectUserEmailDelivery({
      rows: [],
      now: new Date("2026-11-13T12:00:00Z"),
    });
    expect(first.remainingResends).toBe(2);
    expect(corrected.remainingResends).toBe(3);
    expect(corrected.state).toBe("not_sent");
  });

  it("segna assistenza dopo due errori tecnici consecutivi", () => {
    const snapshot = projectUserEmailDelivery({
      rows: [
        { status: "FAILED", queuedAt, idempotencyKey: "email-verify:u1:a" },
        {
          status: "FAILED",
          queuedAt: new Date("2026-11-13T10:05:00Z"),
          idempotencyKey: userEmailResendIdempotencyKey("email-verify:u1:b"),
        },
      ],
      now: new Date("2026-11-13T12:00:00Z"),
    });
    expect(snapshot.contactSupport).toBe(true);
    expect(snapshot.decision.allow).toBe(true);
  });
});

describe("reset password", () => {
  it("usa lo stesso tetto per account presente e assente", () => {
    const empty = projectPasswordResetAttempts({ attempts: [], now: new Date("2026-11-13T12:00:00Z") });
    const three = projectPasswordResetAttempts({
      attempts: [
        { createdAt: new Date("2026-11-13T10:00:00Z") },
        { createdAt: new Date("2026-11-13T10:05:00Z") },
        { createdAt: new Date("2026-11-13T10:10:00Z") },
        { createdAt: new Date("2026-11-13T10:15:00Z") },
      ],
      now: new Date("2026-11-13T12:00:00Z"),
    });
    expect(empty.decision).toEqual({ allow: true });
    expect(empty.remainingResends).toBe(3);
    expect(three.decision).toEqual({ allow: false, reason: "exhausted" });
    expect(three.contactSupport).toBe(true);
  });
});

describe("chiave reinvio utente", () => {
  it("marca solo i reinvii espliciti", () => {
    expect(isUserEmailResendKey("email-verify:u1:abc")).toBe(false);
    expect(isUserEmailResendKey(userEmailResendIdempotencyKey("email-verify:u1:abc"))).toBe(true);
  });
});
