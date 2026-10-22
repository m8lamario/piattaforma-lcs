"use client";

import { useActionState, useState } from "react";
import { saveEditionDefaultFeesAction, saveTeamFeesAction } from "@/features/admin/actions";
import {
  formatEuro,
  parseEuroToCents,
  teamFeeIsCustom,
} from "@/features/payments/domain/fees";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Defaults = {
  playerFeeCents: number | null;
  staffFeeCents: number | null;
  teamFeeCents: number | null;
};

type TeamRow = Defaults & {
  id: string;
  teamName: string;
  schoolName: string;
  schoolCity: string;
};

type Props = {
  editionId: string;
  currency: string;
  defaults: Defaults;
  teams: TeamRow[];
};

type Draft = { player: string; staff: string; team: string };

function optionalCents(raw: string) {
  if (!raw.trim()) return { ok: true as const, cents: null };
  const parsed = parseEuroToCents(raw);
  return parsed.ok ? { ok: true as const, cents: parsed.cents } : { ok: false as const };
}

function money(cents: number | null, fallback: number | null, currency: string) {
  if (cents !== null) return `${formatEuro(cents)} ${currency}`;
  if (fallback === null) return "—";
  return `${formatEuro(fallback)} ${currency} (${it.adminFeesDefault})`;
}

function shown(override: number | null, fallback: number | null, currency: string) {
  const cents = override ?? fallback;
  return cents === null ? "—" : `${formatEuro(cents)} ${currency}`;
}

export function TeamFeesManager({ editionId, currency, defaults, teams }: Props) {
  const [editionState, editionAction, editionPending] = useActionState(saveEditionDefaultFeesAction, undefined);
  const [teamState, teamAction, teamPending] = useActionState(saveTeamFeesAction, undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "custom" | "default">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editionDraft, setEditionDraft] = useState<Draft>({
    player: defaults.playerFeeCents === null ? "" : formatEuro(defaults.playerFeeCents),
    staff: defaults.staffFeeCents === null ? "" : formatEuro(defaults.staffFeeCents),
    team: defaults.teamFeeCents === null ? "" : formatEuro(defaults.teamFeeCents),
  });
  const [teamDraft, setTeamDraft] = useState<Draft>({ player: "", staff: "", team: "" });
  const [editionConfirm, setEditionConfirm] = useState<string[] | null>(null);
  const [teamConfirm, setTeamConfirm] = useState<string[] | null>(null);
  const [ackedEditionSave, setAckedEditionSave] = useState(editionState);
  const [ackedTeamSave, setAckedTeamSave] = useState(teamState);
  const [localError, setLocalError] = useState<string | null>(null);
  if (editionState?.saved && ackedEditionSave !== editionState) {
    setAckedEditionSave(editionState);
    setEditionConfirm(null);
  }
  if (teamState?.saved && ackedTeamSave !== teamState) {
    setAckedTeamSave(teamState);
    setTeamConfirm(null);
  }

  const needle = query.trim().toLocaleLowerCase("it");
  const visible = teams.filter((team) => {
    const custom = teamFeeIsCustom(team);
    if (filter === "custom" && !custom) return false;
    if (filter === "default" && custom) return false;
    if (!needle) return true;
    return `${team.schoolName} ${team.teamName} ${team.schoolCity}`.toLocaleLowerCase("it").includes(needle);
  });
  const editing = teams.find((team) => team.id === editingId) ?? null;
  const showEditionConfirm = Boolean(editionConfirm);
  const showTeamConfirm = Boolean(teamConfirm);

  function reviewEdition() {
    const player = optionalCents(editionDraft.player);
    const staff = parseEuroToCents(editionDraft.staff);
    const team = optionalCents(editionDraft.team);
    if (!player.ok || !staff.ok || !team.ok) {
      setLocalError(it.adminFeesInvalid);
      setEditionConfirm(null);
      return;
    }
    const lines = [
      player.cents === defaults.playerFeeCents
        ? null
        : `${it.adminFeesPlayer}: ${money(defaults.playerFeeCents, null, currency)} → ${money(player.cents, null, currency)}`,
      staff.cents === defaults.staffFeeCents
        ? null
        : `${it.adminFeesStaff}: ${money(defaults.staffFeeCents, null, currency)} → ${money(staff.cents, null, currency)}`,
      team.cents === defaults.teamFeeCents
        ? null
        : `${it.adminFeesTeam}: ${money(defaults.teamFeeCents, null, currency)} → ${money(team.cents, null, currency)}`,
    ].filter((line): line is string => Boolean(line));
    setLocalError(lines.length === 0 ? it.adminFeesNoChange : null);
    setEditionConfirm(lines.length === 0 ? null : lines);
  }

  function reviewTeam() {
    if (!editing) return;
    const player = optionalCents(teamDraft.player);
    const staff = optionalCents(teamDraft.staff);
    const team = optionalCents(teamDraft.team);
    if (!player.ok || !staff.ok || !team.ok) {
      setLocalError(it.adminFeesInvalid);
      setTeamConfirm(null);
      return;
    }
    const lines = [
      player.cents === editing.playerFeeCents
        ? null
        : `${it.adminFeesPlayer}: ${money(editing.playerFeeCents, defaults.playerFeeCents, currency)} → ${money(player.cents, defaults.playerFeeCents, currency)}`,
      staff.cents === editing.staffFeeCents
        ? null
        : `${it.adminFeesStaff}: ${money(editing.staffFeeCents, defaults.staffFeeCents, currency)} → ${money(staff.cents, defaults.staffFeeCents, currency)}`,
      team.cents === editing.teamFeeCents
        ? null
        : `${it.adminFeesTeam}: ${money(editing.teamFeeCents, defaults.teamFeeCents, currency)} → ${money(team.cents, defaults.teamFeeCents, currency)}`,
    ].filter((line): line is string => Boolean(line));
    setLocalError(lines.length === 0 ? it.adminFeesNoChange : null);
    setTeamConfirm(lines.length === 0 ? null : lines);
  }

  function startEdit(team: TeamRow) {
    setEditingId(team.id);
    setTeamDraft({
      player: team.playerFeeCents === null ? "" : formatEuro(team.playerFeeCents),
      staff: team.staffFeeCents === null ? "" : formatEuro(team.staffFeeCents),
      team: team.teamFeeCents === null ? "" : formatEuro(team.teamFeeCents),
    });
    setTeamConfirm(null);
    setLocalError(null);
  }

  return (
    <div className={styles.colMain}>
      {editionState?.saved || teamState?.saved ? (
        <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
          {it.adminFeesSaved}
        </p>
      ) : null}
      {localError ? <p className={styles.banner}>{localError}</p> : null}

      <section className={styles.sideCard}>
        <h2 className={styles.sectionTitle}>{it.adminFeesDefaults}</h2>
        <p className={styles.meta}>{it.adminFeesHelp}</p>
        {showEditionConfirm && editionConfirm ? (
          <form action={editionAction} className={fields.form}>
            <input type="hidden" name="editionId" value={editionId} />
            <input type="hidden" name="confirm" value="yes" />
            <input type="hidden" name="playerFee" value={editionDraft.player} />
            <input type="hidden" name="staffFee" value={editionDraft.staff} />
            <input type="hidden" name="teamFee" value={editionDraft.team} />
            <ul className={styles.confirmList}>
              {editionConfirm.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {editionState?.error ? <ActionError error={editionState.error} code={editionState.code} /> : null}
            <div className={fields.actions}>
              <PendingSubmitButton idle={it.adminFeesConfirm} pendingLabel={it.adminFeesSaving} />
              <Button type="button" variant="ghost" onClick={() => setEditionConfirm(null)} disabled={editionPending}>
                {it.adminFeesCancel}
              </Button>
            </div>
          </form>
        ) : (
          <div className={fields.form}>
            <div className={styles.feeGrid}>
              <FeeField
                id="edition-player"
                label={it.adminPlayerFee}
                value={editionDraft.player}
                onChange={(player) => setEditionDraft({ ...editionDraft, player })}
              />
              <FeeField
                id="edition-staff"
                label={it.adminStaffFee}
                value={editionDraft.staff}
                onChange={(staff) => setEditionDraft({ ...editionDraft, staff })}
              />
              <FeeField
                id="edition-team"
                label={it.adminTeamFee}
                value={editionDraft.team}
                onChange={(team) => setEditionDraft({ ...editionDraft, team })}
              />
            </div>
            <div className={fields.actions}>
              <Button type="button" onClick={reviewEdition}>
                {it.adminFeesReview}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.filters}>
        <div className={styles.filtersRow}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="fee-search">
              {it.adminFeesSearch}
            </label>
            <input
              id="fee-search"
              className={fields.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="fee-filter">
              {it.adminFeesFilter}
            </label>
            <select
              id="fee-filter"
              className={fields.input}
              value={filter}
              onChange={(event) => setFilter(event.target.value as "all" | "custom" | "default")}
            >
              <option value="all">{it.adminFeesFilterAll}</option>
              <option value="custom">{it.adminFeesFilterCustom}</option>
              <option value="default">{it.adminFeesFilterDefault}</option>
            </select>
          </div>
        </div>
      </section>

      {visible.length === 0 ? <p className={styles.empty}>{it.adminFeesNone}</p> : null}
      {visible.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{it.adminSchool}</th>
                <th>{it.adminTeam}</th>
                <th>{it.adminFeesPlayer}</th>
                <th>{it.adminFeesStaff}</th>
                <th>{it.adminFeesTeam}</th>
                <th>{it.adminFeesFilter}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((team) => {
                const custom = teamFeeIsCustom(team);
                return (
                  <tr key={team.id}>
                    <td>
                      {team.schoolName}
                      {team.schoolCity ? <span className={styles.meta}>{team.schoolCity}</span> : null}
                    </td>
                    <td>{team.teamName}</td>
                    <td>{shown(team.playerFeeCents, defaults.playerFeeCents, currency)}</td>
                    <td>{shown(team.staffFeeCents, defaults.staffFeeCents, currency)}</td>
                    <td>{shown(team.teamFeeCents, defaults.teamFeeCents, currency)}</td>
                    <td>
                      <StatusChip tone={custom ? "attention" : "neutral"}>
                        {custom ? it.adminFeesCustom : it.adminFeesDefault}
                      </StatusChip>
                    </td>
                    <td>
                      <Button type="button" variant="ghost" onClick={() => startEdit(team)}>
                        {it.adminFeesEdit}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing ? (
        <section className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>
            {it.adminFeesEditTitle} · {editing.teamName}
          </h2>
          <p className={styles.meta}>{it.adminFeesEmptyField}</p>
          {showTeamConfirm && teamConfirm ? (
            <form action={teamAction} className={fields.form}>
              <input type="hidden" name="editionId" value={editionId} />
              <input type="hidden" name="teamId" value={editing.id} />
              <input type="hidden" name="confirm" value="yes" />
              <input type="hidden" name="playerFee" value={teamDraft.player} />
              <input type="hidden" name="staffFee" value={teamDraft.staff} />
              <input type="hidden" name="teamFee" value={teamDraft.team} />
              <ul className={styles.confirmList}>
                {teamConfirm.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {teamState?.error ? <ActionError error={teamState.error} code={teamState.code} /> : null}
              <div className={fields.actions}>
                <PendingSubmitButton idle={it.adminFeesConfirm} pendingLabel={it.adminFeesSaving} />
                <Button type="button" variant="ghost" onClick={() => setTeamConfirm(null)} disabled={teamPending}>
                  {it.adminFeesCancel}
                </Button>
              </div>
            </form>
          ) : (
            <div className={fields.form}>
              <div className={styles.feeGrid}>
                <FeeField
                  id="team-player"
                  label={it.adminPlayerFee}
                  value={teamDraft.player}
                  onChange={(player) => setTeamDraft({ ...teamDraft, player })}
                />
                <FeeField
                  id="team-staff"
                  label={it.adminStaffFee}
                  value={teamDraft.staff}
                  onChange={(staff) => setTeamDraft({ ...teamDraft, staff })}
                />
                <FeeField
                  id="team-team"
                  label={it.adminTeamFee}
                  value={teamDraft.team}
                  onChange={(team) => setTeamDraft({ ...teamDraft, team })}
                />
              </div>
              <div className={fields.actions}>
                <Button type="button" onClick={reviewTeam}>
                  {it.adminFeesReview}
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function FeeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={fields.field}>
      <label className={fields.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={fields.input}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
