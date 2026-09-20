"use client";

import { selectTeamAction } from "@/features/teams/actions";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  teams: { id: string; name: string }[];
  selectedId: string;
};

export function TeamSwitcher({ teams, selectedId }: Props) {
  if (teams.length < 2) return null;
  return (
    <form action={selectTeamAction} className={fields.field}>
      <label className={fields.label} htmlFor="team-switch">
        {it.teamSwitch}
      </label>
      <select
        id="team-switch"
        name="teamId"
        className={fields.input}
        defaultValue={selectedId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </form>
  );
}
