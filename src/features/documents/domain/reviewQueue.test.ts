import { describe, expect, it } from "vitest";
import { applyReviewResult, nextPendingAfter, reviewQueuePosition, type ReviewQueueItem } from "./reviewQueue";

const item = (id: string, iso: string): ReviewQueueItem => ({ id, uploadedAt: new Date(iso) });

describe("coda di revisione certificati", () => {
  const queue = [item("a", "2026-10-01"), item("b", "2026-10-02"), item("c", "2026-10-03")];

  it("indica la posizione e i vicini", () => {
    expect(reviewQueuePosition(queue, "b")).toEqual({
      inQueue: true,
      position: 2,
      total: 3,
      remaining: 1,
      prevId: "a",
      nextId: "c",
    });
  });

  it("non conta un documento già uscito dalla coda", () => {
    const position = reviewQueuePosition(queue, "archivio");
    expect(position.inQueue).toBe(false);
    expect(position.total).toBe(3);
    expect(position.remaining).toBe(3);
    expect(position.nextId).toBe("a");
  });

  it("dopo il salvataggio apre il successivo e, in fondo, il primo ancora in attesa", () => {
    const remaining = [item("a", "2026-10-01"), item("c", "2026-10-03")];
    expect(nextPendingAfter(remaining, item("b", "2026-10-02"))).toBe("c");
    expect(nextPendingAfter([item("a", "2026-10-01")], item("c", "2026-10-03"))).toBe("a");
    expect(nextPendingAfter([], item("c", "2026-10-03"))).toBeNull();
  });

  it("non riseleziona il certificato appena revisionato se è ancora nella lista", () => {
    const stillListed = [item("a", "2026-10-01"), item("b", "2026-10-02"), item("c", "2026-10-03")];
    expect(nextPendingAfter(stillListed, item("b", "2026-10-02"))).toBe("c");
    expect(nextPendingAfter([item("b", "2026-10-02")], item("b", "2026-10-02"))).toBeNull();
  });
});

describe("esito revisione e selezione", () => {
  const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("dopo Successivo, approvare apre il successivo e non un certificato già visto", () => {
    const applied = applyReviewResult("b", queue, {
      reviewedId: "b",
      nextId: "a",
      queue: [{ id: "a" }, { id: "c" }],
    });
    expect(applied).toEqual({
      status: "next",
      currentId: "c",
      queue: [{ id: "a" }, { id: "c" }],
    });
  });

  it("rifiutare usa la stessa selezione dell'approvare", () => {
    const applied = applyReviewResult("a", queue, {
      reviewedId: "a",
      nextId: "b",
      queue: [{ id: "b" }, { id: "c" }],
    });
    expect(applied).toEqual({
      status: "next",
      currentId: "b",
      queue: [{ id: "b" }, { id: "c" }],
    });
  });

  it("in fondo torna al primo ancora in attesa", () => {
    expect(
      applyReviewResult("c", queue, {
        reviewedId: "c",
        nextId: "c",
        queue: [{ id: "a" }, { id: "b" }],
      }),
    ).toEqual({
      status: "next",
      currentId: "a",
      queue: [{ id: "a" }, { id: "b" }],
    });
  });

  it("con un solo certificato chiude la coda", () => {
    expect(
      applyReviewResult("a", [{ id: "a" }], {
        reviewedId: "a",
        nextId: "a",
        queue: [{ id: "a" }],
      }),
    ).toEqual({ status: "done", queue: [] });
  });

  it("ignora una risposta che non riguarda il certificato a schermo", () => {
    expect(
      applyReviewResult("c", queue, {
        reviewedId: "a",
        nextId: "b",
        queue: [{ id: "b" }, { id: "c" }],
      }),
    ).toEqual({ status: "ignored" });
  });

  it("percorre più certificati di seguito senza tornare indietro", () => {
    const first = applyReviewResult("a", queue, {
      reviewedId: "a",
      nextId: "b",
      queue: [{ id: "b" }, { id: "c" }],
    });
    expect(first).toMatchObject({ status: "next", currentId: "b" });
    if (first.status !== "next") return;
    const second = applyReviewResult(first.currentId, first.queue, {
      reviewedId: "b",
      nextId: "a",
      queue: [{ id: "c" }],
    });
    expect(second).toEqual({ status: "next", currentId: "c", queue: [{ id: "c" }] });
  });
});