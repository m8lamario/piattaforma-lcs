import { describe, expect, it } from "vitest";
import { endMarkerIsVisible, scrollerReachedEnd } from "./legalReaderScroll";

describe("scrollerReachedEnd", () => {
  it("considera già letto un testo che entra nel riquadro", () => {
    expect(scrollerReachedEnd({ scrollHeight: 400, clientHeight: 400, scrollTop: 0 })).toBe(true);
  });

  it("non sblocca un testo lungo se si è ancora in cima", () => {
    expect(scrollerReachedEnd({ scrollHeight: 4000, clientHeight: 600, scrollTop: 0 })).toBe(false);
  });

  it("sblocca anche se iOS si ferma qualche pixel prima del fondo", () => {
    expect(scrollerReachedEnd({ scrollHeight: 4000, clientHeight: 600, scrollTop: 3350 })).toBe(true);
  });
});

describe("endMarkerIsVisible", () => {
  const viewport = { top: 0, height: 700 };

  it("non sblocca se il fondo è ancora sotto lo schermo", () => {
    expect(endMarkerIsVisible({ top: 1400, bottom: 1401 }, viewport)).toBe(false);
  });

  it("sblocca quando il fondo entra nello schermo, anche coperto dal piede", () => {
    expect(endMarkerIsVisible({ top: 760, bottom: 761 }, viewport)).toBe(true);
  });
});
