import { describe, expect, it } from "vitest";
import { fileCacheEvictionTargets, reviewPreloadIds } from "./reviewPreload";

describe("precaricamento coda revisione", () => {
  const queue = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("precarica il corrente e i due successivi", () => {
    expect(reviewPreloadIds(queue, "b")).toEqual(["b", "c", "d"]);
    expect(reviewPreloadIds(queue, "c")).toEqual(["c", "d"]);
    expect(reviewPreloadIds(queue, "d")).toEqual(["d"]);
  });

  it("con un id fuori coda precarica solo quell'id", () => {
    expect(reviewPreloadIds(queue, "missing")).toEqual(["missing"]);
  });

  it("libera i file fuori dalla finestra mantenuta", () => {
    expect(fileCacheEvictionTargets(["b", "c"], ["a", "b", "c", "d"])).toEqual(["a", "d"]);
  });
});
