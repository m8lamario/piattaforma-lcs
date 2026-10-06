import { Prisma } from "@generated/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailWebhookEvent } from "@/shared/adapters/types";

const { findFirst, update, create } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  prisma: {
    emailMessage: { findFirst, update },
    emailEvent: { create },
  },
}));

vi.mock("@/shared/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { applyEmailWebhookEvent } from "./events";

function event(overrides: Partial<EmailWebhookEvent> = {}): EmailWebhookEvent {
  return {
    provider: "resend",
    providerEventId: "evt_1",
    type: "email.delivered",
    providerMessageId: "re_123",
    occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    bounceType: null,
    summary: null,
    ...overrides,
  };
}

describe("webhook storico email", () => {
  beforeEach(() => {
    findFirst.mockReset();
    update.mockReset();
    create.mockReset();
  });

  it("risponde ignorato se il messaggio non esiste, senza errore", async () => {
    findFirst.mockResolvedValue(null);
    const result = await applyEmailWebhookEvent(event());
    expect(result).toEqual({ ok: true, ignored: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("non duplica un evento già ricevuto", async () => {
    findFirst.mockResolvedValue({
      id: "msg_1",
      status: "SENT",
      errorCode: null,
      errorMessage: null,
    });
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.0.0",
      }),
    );
    const result = await applyEmailWebhookEvent(event());
    expect(result).toEqual({ ok: true, idempotent: true, ignored: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("archivia opened senza cambiare lo stato", async () => {
    findFirst.mockResolvedValue({
      id: "msg_1",
      status: "DELIVERED",
      errorCode: null,
      errorMessage: null,
    });
    create.mockResolvedValue({ id: "evt_row" });
    update.mockResolvedValue({});
    await applyEmailWebhookEvent(event({ type: "email.opened" }));
    expect(update).toHaveBeenCalledWith({
      where: { id: "msg_1" },
      data: { lastEventAt: expect.any(Date) },
    });
  });
});
