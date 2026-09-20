import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/shared/errors";
import { workspaceWriteCode } from "./writeGate";

describe("workspaceWriteCode", () => {
  it("blocca ritirati e finestre chiuse", () => {
    expect(
      workspaceWriteCode({
        status: "WITHDRAWN",
        isActive: true,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toBe(ERROR_CODES.REGISTRATION_WITHDRAWN);
    expect(
      workspaceWriteCode({
        status: "IN_PROGRESS",
        isActive: false,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toBe(ERROR_CODES.REGISTRATION_WINDOW_CLOSED);
    expect(
      workspaceWriteCode({
        status: "IN_PROGRESS",
        isActive: true,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toBeNull();
    expect(
      workspaceWriteCode({
        status: "REMOVED",
        isActive: true,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toBe(ERROR_CODES.LIFECYCLE_REGISTRATION_REMOVED);
  });
});
