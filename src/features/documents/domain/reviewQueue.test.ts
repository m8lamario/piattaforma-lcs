import { describe, expect, it } from "vitest";
import { nextPendingAfter, reviewQueuePosition, type ReviewQueueItem } from "./reviewQueue";

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
});