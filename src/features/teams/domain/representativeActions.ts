import { rosterFilterHref, type RosterCounts } from "./roster";

export type RepresentativeActionId = "invited" | "unread";

export type RepresentativeAction = {
  id: RepresentativeActionId;
  href: string;
  count: number;
  urgency: "high" | "medium" | "low";
};

export function representativeNowActions(input: {
  counts: RosterCounts;
  unreadCount: number;
}): RepresentativeAction[] {
  const actions: RepresentativeAction[] = [];
  if (input.counts.invited > 0) {
    actions.push({
      id: "invited",
      href: rosterFilterHref("invited"),
      count: input.counts.invited,
      urgency: "high",
    });
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
