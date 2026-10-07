import { rosterFilterHref, unpublishedCount, type RosterCounts, type RosterRow } from "./roster";

export type RepresentativeActionId =
  | "attention"
  | "invited"
  | "inProgress"
  | "publication"
  | "payment"
  | "unread";

export type RepresentativeAction = {
  id: RepresentativeActionId;
  href: string;
  count: number;
  urgency: "high" | "medium" | "low";
};

export function representativeNowActions(input: {
  counts: RosterCounts;
  rows: Pick<RosterRow, "publication">[];
  unreadCount: number;
  teamPaymentDue?: boolean;
}): RepresentativeAction[] {
  const actions: RepresentativeAction[] = [];
  if (input.counts.attention > 0) {
    actions.push({
      id: "attention",
      href: rosterFilterHref("attention"),
      count: input.counts.attention,
      urgency: "high",
    });
  }
  if (input.counts.invited > 0) {
    actions.push({
      id: "invited",
      href: rosterFilterHref("invited"),
      count: input.counts.invited,
      urgency: "high",
    });
  }
  if (input.counts.inProgress > 0) {
    actions.push({
      id: "inProgress",
      href: rosterFilterHref("inProgress"),
      count: input.counts.inProgress,
      urgency: "medium",
    });
  }
  const unpublished = unpublishedCount(input.rows);
  if (unpublished > 0) {
    actions.push({
      id: "publication",
      href: rosterFilterHref("publication"),
      count: unpublished,
      urgency: "medium",
    });
  }
  if (input.teamPaymentDue) {
    actions.push({ id: "payment", href: "/squadra", count: 1, urgency: "high" });
  }
  if (input.unreadCount > 0) {
    actions.push({
      id: "unread",
      href: "/area/comunicazioni",
      count: input.unreadCount,
      urgency: "low",
    });
  }
  return actions;
}
