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
  it("non elenca azioni se la rosa è in regola e non ci sono avvisi", () => {
    expect(
      representativeNowActions({
        counts: { ...empty, total: 2, ok: 2 },
        rows: [{ publication: { status: "publishable", channels: true, promotion: true, sponsor: false, press: false, interviews: false, fullSurname: false } }],
        unreadCount: 0,
      }),
    ).toEqual([]);
  });

  it("ordina per urgenza e punta ai filtri della rosa", () => {
    const actions = representativeNowActions({
      counts: { ...empty, total: 4, invited: 2, inProgress: 1, attention: 1 },
      rows: [{ publication: { status: "not_publishable", channels: false, promotion: false, sponsor: false, press: false, interviews: false, fullSurname: false } }],
      unreadCount: 3,
      teamPaymentDue: true,
    });
    expect(actions.map((action) => action.id)).toEqual([
      "attention",
      "invited",
      "inProgress",
      "publication",
      "payment",
      "unread",
    ]);
    expect(actions[0]?.href).toBe("/squadra?stato=attention");
    expect(actions[3]?.href).toBe("/squadra?stato=publication");
    expect(actions[5]?.href).toBe("/area/comunicazioni");
  });
});
