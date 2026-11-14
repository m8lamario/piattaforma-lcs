import { describe, expect, it } from "vitest";
import { readSchoolAccessRequestId, signSchoolAccessRequestId } from "./requestCookie";

describe("cookie richiesta scuola", () => {
  it("accetta solo la firma del request id", () => {
    process.env.AUTH_SECRET = "test-secret-for-school-cookie";
    const value = signSchoolAccessRequestId("req_123");
    expect(readSchoolAccessRequestId(value)).toBe("req_123");
    expect(readSchoolAccessRequestId("req_123.deadbeef")).toBeNull();
    expect(readSchoolAccessRequestId("req_other" + value.slice(value.indexOf(".")))).toBeNull();
  });
});
