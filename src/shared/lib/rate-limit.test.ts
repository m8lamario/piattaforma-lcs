import { describe, expect, it } from "vitest";
import { allowRequest } from "./rate-limit";

describe("allowRequest", () => {
  it("consente fino al limite e poi blocca nella finestra", () => {
    const store = new Map<string, number[]>();
    const windowMs = 60_000;
    expect(allowRequest(store, "ip:1", 2, windowMs, 1_000)).toBe(true);
    expect(allowRequest(store, "ip:1", 2, windowMs, 2_000)).toBe(true);
    expect(allowRequest(store, "ip:1", 2, windowMs, 3_000)).toBe(false);
  });

  it("azzera il conteggio fuori dalla finestra", () => {
    const store = new Map<string, number[]>();
    expect(allowRequest(store, "ip:2", 1, 1_000, 1_000)).toBe(true);
    expect(allowRequest(store, "ip:2", 1, 1_000, 2_100)).toBe(true);
  });
});
