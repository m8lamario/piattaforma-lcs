import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ACTION_BODY_LIMIT_BYTES,
  UPLOAD_PROXY_BODY_LIMIT_BYTES,
} from "./app";

describe("upload body limits", () => {
  it("accetta un file fino al tetto configurato, non al default di 1 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBeGreaterThan(1024 * 1024);
    expect(UPLOAD_ACTION_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_UPLOAD_BYTES);
    expect(UPLOAD_PROXY_BODY_LIMIT_BYTES).toBeGreaterThan(UPLOAD_ACTION_BODY_LIMIT_BYTES);
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe(UPLOAD_ACTION_BODY_LIMIT_BYTES);
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBe(UPLOAD_PROXY_BODY_LIMIT_BYTES);
  });
});
