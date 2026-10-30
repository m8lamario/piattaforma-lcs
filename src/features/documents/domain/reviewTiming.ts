export type ReviewTimingPhase = "post_review_transition" | "cold_file" | "warm_file";

export type ReviewTimingSample = {
  phase: ReviewTimingPhase;
  ms: number;
  documentId: string;
};

export function elapsedMs(start: number, end: number = nowMs()) {
  return Math.max(0, Math.round(end - start));
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function fileDisplayPhase(wasCached: boolean): Exclude<ReviewTimingPhase, "post_review_transition"> {
  return wasCached ? "warm_file" : "cold_file";
}

/** In-memory ring buffer for dev/tests; not persisted. */
const samples: ReviewTimingSample[] = [];
const MAX_SAMPLES = 40;

export function recordReviewTiming(sample: ReviewTimingSample) {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function reviewTimingSamples(): readonly ReviewTimingSample[] {
  return samples;
}

export function resetReviewTimingSamples() {
  samples.length = 0;
}

export function reviewTimingSummary(samplesInput: readonly ReviewTimingSample[] = samples) {
  const byPhase = new Map<ReviewTimingPhase, number[]>();
  for (const sample of samplesInput) {
    const bucket = byPhase.get(sample.phase) ?? [];
    bucket.push(sample.ms);
    byPhase.set(sample.phase, bucket);
  }
  const average = (values: number[]) =>
    values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    post_review_transition: average(byPhase.get("post_review_transition") ?? []),
    cold_file: average(byPhase.get("cold_file") ?? []),
    warm_file: average(byPhase.get("warm_file") ?? []),
    count: samplesInput.length,
  };
}
