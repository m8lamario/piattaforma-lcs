import {
  isRegistrationWindowOpen,
  type EditionWindow,
} from "@/features/registrations/domain/window";
import { ERROR_CODES, type ErrorCode } from "@/shared/errors";

export function registrationWriteBlocker(input: {
  status: string;
  window: EditionWindow;
  now?: Date;
}) {
  if (input.status === "WITHDRAWN") return "withdrawn" as const;
  if (input.status === "REMOVED") return "removed" as const;
  if (!isRegistrationWindowOpen(input.window, input.now)) return "window_closed" as const;
  return null;
}

export function writeBlockerCode(reason: "withdrawn" | "removed" | "window_closed"): ErrorCode {
  if (reason === "withdrawn") return ERROR_CODES.REGISTRATION_WITHDRAWN;
  if (reason === "removed") return ERROR_CODES.LIFECYCLE_REGISTRATION_REMOVED;
  return ERROR_CODES.REGISTRATION_WINDOW_CLOSED;
}

export function workspaceWriteCode(registration: {
  status: string;
  isActive: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
}): ErrorCode | null {
  const reason = registrationWriteBlocker({
    status: registration.status,
    window: {
      isActive: registration.isActive,
      registrationOpensAt: registration.registrationOpensAt,
      registrationClosesAt: registration.registrationClosesAt,
    },
  });
  return reason ? writeBlockerCode(reason) : null;
}

/** @deprecated usa workspaceWriteCode; tenuto per i test di transizione */
export function workspaceWriteError(registration: {
  status: string;
  isActive: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
}) {
  return workspaceWriteCode(registration);
}

