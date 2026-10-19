"use client";

import { useActionState } from "react";
import { createMediaPartnerAction, updateMediaPartnerAction } from "@/features/media-partners/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Competition = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  partnerId?: string;
  name?: string;
  selectedIds?: string[];
  competitions: Competition[];
};

export function PartnerOrgForm({ mode, partnerId, name, selectedIds = [], competitions }: Props) {
  const action = mode === "create" ? createMediaPartnerAction : updateMediaPartnerAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className={fields.form} noValidate aria-busy={pending}>
      {partnerId ? <input type="hidden" name="id" value={partnerId} /> : null}
      <div className={fields.field}>
        <label className={fields.label} htmlFor="media-partner-name">
          {it.mediaPartnerName}
        </label>
        <input
          id="media-partner-name"
          name="name"
          className={fields.input}
          defaultValue={name ?? ""}
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.mediaPartnerCompetitions}</legend>
        {competitions.map((competition) => (
          <label key={competition.id} className={fields.radio}>
            <input
              type="checkbox"
              name="competitionId"
              value={competition.id}
              defaultChecked={selectedIds.includes(competition.id)}
            />
            <span>{competition.name}</span>
          </label>
        ))}
      </fieldset>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {state?.done ? (
        <p className={fields.bannerOk} role="status">
          {it.mediaPartnerSave}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : mode === "create" ? it.mediaPartnerCreateSubmit : it.mediaPartnerSave}
        </Button>
      </div>
    </form>
  );
}
