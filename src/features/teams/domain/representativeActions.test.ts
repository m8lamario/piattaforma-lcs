import { describe, expect, it } from "vitest";
import { representativeNowActions } from "./representativeActions";
import type { RosterCounts } from "./roster";

const empty: RosterCounts = {
  total: 0,
  invited: 0,
  inProgress: 0,
  attention: 0,
  ok: 0,
  withdrawn: 0,
};

describe("representativeNowActions", () => {
  it("non elenca azioni se non restano inviti o messaggi", () => {
    expect(
      representativeNowActions({
        counts: { ...empty, total: 2, ok: 2, inProgress: 1, attention: 1 },
        unreadCount: 0,
      }),
    ).toEqual([]);
  });

  it("tiene solo inviti da accettare e comunicazioni non lette", () => {
    const actions = representativeNowActions({
      counts: { ...empty, total: 4, invited: 2, inProgress: 1, attention: 1 },
      unreadCount: 3,
    });
    expect(actions.map((action) => action.id)).toEqual(["invited", "unread"]);
    expect(actions[0]?.href).toBe("/squadra?stato=invited");
    expect(actions[1]?.href).toBe("/area/comunicazioni");
  });
});
