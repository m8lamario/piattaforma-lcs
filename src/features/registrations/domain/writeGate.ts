import {
  isRegistrationWindowOpen,
  type EditionWindow,
} from "@/features/registrations/domain/window";

export function registrationWriteBlocker(input: {
  status: string;
  window: EditionWindow;
  now?: Date;
}) {
  if (input.status === "WITHDRAWN") return "withdrawn" as const;
  if (!isRegistrationWindowOpen(input.window, input.now)) return "window_closed" as const;
  return null;
}

export function writeBlockerMessage(reason: "withdrawn" | "window_closed") {
  if (reason === "withdrawn") return "Questa iscrizione è ritirata.";
  return "Le iscrizioni di questa edizione non sono aperte adesso.";
}

export function workspaceWriteError(registration: {
  status: string;
  isActive: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
}) {
  const reason = registrationWriteBlocker({
    status: registration.status,
    window: {
      isActive: registration.isActive,
      registrationOpensAt: registration.registrationOpensAt,
      registrationClosesAt: registration.registrationClosesAt,
    },
  });
  return reason ? writeBlockerMessage(reason) : null;
}

