import { describe, expect, it } from "vitest";
import {
  fileDisplayPhase,
  recordReviewTiming,
  resetReviewTimingSamples,
  reviewTimingSummary,
} from "./reviewTiming";

describe("metriche revisione certificati", () => {
  it("classifica file caldo e freddo", () => {
    expect(fileDisplayPhase(true)).toBe("warm_file");
    expect(fileDisplayPhase(false)).toBe("cold_file");
  });

  it("aggrega le medie per fase", () => {
    resetReviewTimingSamples();
    recordReviewTiming({ phase: "warm_file", ms: 10, documentId: "a" });
    recordReviewTiming({ phase: "warm_file", ms: 30, documentId: "b" });
    recordReviewTiming({ phase: "post_review_transition", ms: 50, documentId: "b" });
    expect(reviewTimingSummary()).toEqual({
      post_review_transition: 50,
      cold_file: null,
      warm_file: 20,
      count: 3,
    });
  });
});
