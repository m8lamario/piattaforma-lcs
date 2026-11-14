import { rosterFilterHref, type RosterFilter } from "./roster";
import type { FeeResolution, PaymentMode } from "@/features/payments/domain/fees";

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

export type SchoolChecklistItem = {
  id: SchoolChecklistItemId;
  status: SchoolChecklistStatus;
  href: string;
  count: number;
  administrative: boolean;
};

export type SchoolChecklistPlayer = {
  withdrawn?: boolean;
  personalDataComplete: boolean;
  guardianState: "na" | "none" | "pending" | "authorized" | "refused";
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
): SchoolChecklistItem {
  return { id, status, href, count, administrative };
}

export function projectSchoolChecklist(input: {
  representativeEmailVerified: boolean;
  coachMissing: boolean;
  paymentMode: PaymentMode;
  teamFee: FeeResolution;
  teamPaymentSucceeded: boolean;
  players: SchoolChecklistPlayer[];
  ownRegistrationDue: boolean;
}): { items: SchoolChecklistItem[]; administrativeComplete: boolean } {
  const active = input.players.filter((player) => !player.withdrawn);
  const personalDue = active.filter((player) => !player.personalDataComplete).length;
  const guardianDue = active.filter(
    (player) => player.guardianState === "none" || player.guardianState === "pending" || player.guardianState === "refused",
  ).length;
  const privacyDue = active.filter((player) => !player.privacyComplete).length;
  const mediaDue = active.filter((player) => !player.mediaComplete).length;
  const paymentDue = active.filter((player) => !player.paymentCovered).length;
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

  items.push(
    item("personal", countStatus(personalDue), rosterFilterHref("inProgress"), personalDue, true),
    item("guardian", guardianDue > 0 ? "attention" : "complete", rosterFilterHref("guardian"), guardianDue, true),
    item("privacy", countStatus(privacyDue), rosterFilterHref("inProgress"), privacyDue, true),
    item("media", mediaDue > 0 ? "todo" : "complete", rosterFilterHref("publication"), mediaDue, true),
    item("playerPayment", countStatus(paymentDue), rosterFilterHref("unpaid"), paymentDue, true),
  );

  if (input.ownRegistrationDue) {
    items.push(item("own", "todo", "/area/registrazione", 1, true));
  }

  items.push(
    item("medical", medicalDue > 0 ? "attention" : "complete", rosterFilterHref("medical"), medicalDue, false),
  );

  const administrativeComplete = items
    .filter((entry) => entry.administrative)
    .every((entry) => entry.status === "complete" || entry.status === "waiting_on_org");

  return { items, administrativeComplete };
}

export function schoolChecklistFilter(id: SchoolChecklistItemId): RosterFilter | null {
  if (id === "guardian") return "guardian";
  if (id === "playerPayment") return "unpaid";
  if (id === "medical") return "medical";
  if (id === "media") return "publication";
  return null;
}
