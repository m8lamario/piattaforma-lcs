"use client";

import { selectTeamAction } from "@/features/teams/actions";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import styles from "./TeamSwitcher.module.css";

type Props = {
  teams: { id: string; name: string; edition: { name: string; competition: { name: string } } }[];
  selectedId: string;
};

export function TeamSwitcher({ teams, selectedId }: Props) {
  if (teams.length < 2) return null;
  return (
    <form action={selectTeamAction} className={styles.switcher}>
      <label className={styles.label} htmlFor="team-switch">
        {it.teamSwitch}
      </label>
      <span className={styles.control}>
        <select
          id="team-switch"
          name="teamId"
          className={styles.select}
          defaultValue={selectedId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {`${team.edition.competition.name} · ${team.edition.name} · ${team.name}`}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </span>
    </form>
  );
}
