import { describe, expect, it } from "vitest";
import { workspaceWriteError } from "./writeGate";

describe("workspaceWriteError", () => {
  it("blocca ritirati e finestre chiuse", () => {
    expect(
      workspaceWriteError({
        status: "WITHDRAWN",
        isActive: true,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toMatch(/ritir/);
    expect(
      workspaceWriteError({
        status: "IN_PROGRESS",
        isActive: false,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toMatch(/non sono aperte/);
    expect(
      workspaceWriteError({
        status: "IN_PROGRESS",
        isActive: true,
        registrationOpensAt: null,
        registrationClosesAt: null,
      }),
    ).toBeNull();
  });
});
