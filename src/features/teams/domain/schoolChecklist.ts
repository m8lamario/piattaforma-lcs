import { rosterFilterHref, type RosterFilter } from "./roster";
import type { FeeResolution, PaymentMode } from "@/features/payments/domain/fees";
import {
  isAdministrativeBlocking,
  type ChecklistItem,
} from "@/features/registrations/domain/requirements";

export type SchoolChecklistStatus = "complete" | "todo" | "attention" | "waiting_on_org";

export type SchoolChecklistItemId =
  | "email"
  | "coach"
  | "teamPayment"
  | "personal"
  | "guardian"
  | "privacy"
  | "media"
  | "playerPayment"
  | "own"
  | "medical";

export type SchoolNextActionId = SchoolChecklistItemId | "staff" | "inviteStaff";

export type SchoolChecklistItem = {
  id: SchoolChecklistItemId;
  status: SchoolChecklistStatus;
  href: string;
  count: number;
  administrative: boolean;
  undeliverableCount?: number;
};

export type SchoolNextAction = {
  id: SchoolNextActionId;
  status: SchoolChecklistStatus;
  href: string;
  count: number;
  undeliverableCount: number;
};

export type SchoolChecklistPlayer = {
  withdrawn?: boolean;
  isOwn?: boolean;
  personalDataComplete: boolean;
  guardianState: "na" | "none" | "pending" | "authorized" | "refused";
  guardianEmailUndeliverable?: boolean;
  secondGuardianEmailUndeliverable?: boolean;
  privacyComplete: boolean;
  mediaComplete: boolean;
  paymentCovered: boolean;
  medicalOk: boolean;
};

function countStatus(incomplete: number): SchoolChecklistStatus {
  if (incomplete <= 0) return "complete";
  return "todo";
}

function item(
  id: SchoolChecklistItemId,
  status: SchoolChecklistStatus,
  href: string,
  count: number,
  administrative: boolean,
  undeliverableCount = 0,
): SchoolChecklistItem {
  return { id, status, href, count, administrative, undeliverableCount };
}

function isOpen(item: SchoolChecklistItem) {
  return item.status === "todo" || item.status === "attention";
}

export function isOwnRegistrationDue(input: {
  hasActiveOwnRegistration: boolean;
  checklist?: ChecklistItem[] | null;
}): boolean {
  if (!input.hasActiveOwnRegistration || !input.checklist) return false;
  return input.checklist.some(isAdministrativeBlocking);
}

export function nextSchoolStep(input: {
  items: SchoolChecklistItem[];
  staffPresent: boolean;
  canJoinStaff: boolean;
}): SchoolNextAction | null {
  const admin = input.items.filter((entry) => entry.administrative);
  for (const entry of admin) {
    if (!isOpen(entry)) continue;
    if (entry.id === "own" && input.canJoinStaff) continue;
    if (entry.id === "coach" && !input.staffPresent) {
      if (input.canJoinStaff) {
        return { id: "staff", status: "todo", href: "/area#ruolo", count: 1, undeliverableCount: 0 };
      }
      return {
        id: "inviteStaff",
        status: "todo",
        href: "/squadra/inviti",
        count: 1,
        undeliverableCount: 0,
      };
    }
    return {
      id: entry.id,
      status: entry.status,
      href: entry.href,
      count: entry.count,
      undeliverableCount: entry.undeliverableCount ?? 0,
    };
  }
  return null;
}

export function projectSchoolChecklist(input: {
  representativeEmailVerified: boolean;
  coachMissing: boolean;
  staffPresent: boolean;
  canJoinStaff: boolean;
  paymentMode: PaymentMode;
  teamFee: FeeResolution;
  teamPaymentSucceeded: boolean;
  players: SchoolChecklistPlayer[];
  ownRegistrationDue: boolean;
}): { items: SchoolChecklistItem[]; administrativeComplete: boolean; next: SchoolNextAction | null } {
  const active = input.players.filter((player) => !player.withdrawn);
  const roster = active.filter((player) => !player.isOwn);
  const personalDue = roster.filter((player) => !player.personalDataComplete).length;
  const guardianDue = roster.filter(
    (player) => player.guardianState === "none" || player.guardianState === "pending" || player.guardianState === "refused",
  ).length;
  const guardianUndeliverable = roster.filter(
    (player) => player.guardianEmailUndeliverable || player.secondGuardianEmailUndeliverable,
  ).length;
  const privacyDue = roster.filter((player) => !player.privacyComplete).length;
  const mediaDue = roster.filter((player) => !player.mediaComplete).length;
  const paymentDue = roster.filter((player) => !player.paymentCovered).length;
  const medicalDue = active.filter((player) => !player.medicalOk).length;

  const items: SchoolChecklistItem[] = [
    item(
      "email",
      input.representativeEmailVerified ? "complete" : "todo",
      "/verifica-email",
      input.representativeEmailVerified ? 0 : 1,
      true,
    ),
    item("coach", input.coachMissing ? "todo" : "complete", "/squadra#allenatore", input.coachMissing ? 1 : 0, true),
  ];

  if (input.paymentMode !== "PLAYER") {
    if (input.teamFee.status === "missing") {
      items.push(item("teamPayment", "waiting_on_org", "/squadra", 0, true));
    } else if (input.teamFee.status === "ready") {
      items.push(
        item(
          "teamPayment",
          input.teamPaymentSucceeded ? "complete" : "todo",
          "/squadra",
          input.teamPaymentSucceeded ? 0 : 1,
          true,
        ),
      );
    }
  }

  if (input.ownRegistrationDue && !input.canJoinStaff) {
    items.push(item("own", "todo", "/area#ruolo", 1, true));
  }

  items.push(
    item("personal", countStatus(personalDue), rosterFilterHref("inProgress"), personalDue, true),
    item(
      "guardian",
      guardianDue > 0 || guardianUndeliverable > 0 ? "attention" : "complete",
      rosterFilterHref("guardian"),
      guardianDue,
      true,
      guardianUndeliverable,
    ),
    item("privacy", countStatus(privacyDue), rosterFilterHref("inProgress"), privacyDue, true),
    item("media", mediaDue > 0 ? "todo" : "complete", rosterFilterHref("publication"), mediaDue, true),
    item("playerPayment", countStatus(paymentDue), rosterFilterHref("unpaid"), paymentDue, true),
  );

  items.push(
    item("medical", medicalDue > 0 ? "attention" : "complete", rosterFilterHref("medical"), medicalDue, false),
  );

  const administrativeComplete = items
    .filter((entry) => entry.administrative)
    .every((entry) => entry.status === "complete" || entry.status === "waiting_on_org");

  return {
    items,
    administrativeComplete,
    next: nextSchoolStep({
      items,
      staffPresent: input.staffPresent,
      canJoinStaff: input.canJoinStaff,
    }),
  };
}

export function schoolChecklistFilter(id: SchoolChecklistItemId): RosterFilter | null {
  if (id === "guardian") return "guardian";
  if (id === "playerPayment") return "unpaid";
  if (id === "medical") return "medical";
  if (id === "media") return "publication";
  return null;
}
