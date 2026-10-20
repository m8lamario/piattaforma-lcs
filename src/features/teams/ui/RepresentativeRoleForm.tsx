"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { joinRepresentativeAsParticipantAction } from "@/features/teams/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type RoleChoice = "NONE" | "PLAYER" | "STAFF";

export function RepresentativeRoleForm({ teamId }: { teamId: string }) {
  const [choice, setChoice] = useState<RoleChoice>("NONE");
  const [state, action, pending] = useActionState(joinRepresentativeAsParticipantAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef<RoleChoice | null>(null);
  const submitting = choice !== "NONE";
  const failed = Boolean(state && "error" in state && state.error);

  useEffect(() => {
    if (choice === "NONE" || pending || submitted.current === choice) return;
    submitted.current = choice;
    sessionStorage.setItem(`eph-rep-flow:${teamId}`, "open");
    formRef.current?.requestSubmit();
  }, [choice, pending]);

  return (
    <form ref={formRef} action={action} className={fields.form} noValidate aria-busy={pending}>
      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.repRoleTitle}</legend>
        <p className={fields.help}>{it.repRoleLead}</p>
        <input type="hidden" name="teamId" value={teamId} />
        {submitting ? <input type="hidden" name="category" value={choice} /> : null}

        <label className={fields.radio}>
          <input
            type="radio"
            name="roleChoice"
            value="NONE"
            checked={choice === "NONE"}
            disabled={pending || (submitting && !failed)}
            onChange={() => setChoice("NONE")}
          />
          <span className={fields.choiceCopy}>
            <strong>{it.repRoleNone}</strong>
            <span className={fields.help}>{it.repRoleNoneHelp}</span>
          </span>
        </label>
        <label className={fields.radio}>
          <input
            type="radio"
            name="roleChoice"
            value="PLAYER"
            checked={choice === "PLAYER"}
            disabled={pending || (submitting && !failed && choice !== "PLAYER")}
            onChange={() => setChoice("PLAYER")}
          />
          <span className={fields.choiceCopy}>
            <strong>{it.repRolePlayer}</strong>
            <span className={fields.help}>{it.repRolePlayerHelp}</span>
          </span>
        </label>
        <label className={fields.radio}>
          <input
            type="radio"
            name="roleChoice"
            value="STAFF"
            checked={choice === "STAFF"}
            disabled={pending || (submitting && !failed && choice !== "STAFF")}
            onChange={() => setChoice("STAFF")}
          />
          <span className={fields.choiceCopy}>
            <strong>{it.repRoleStaff}</strong>
            <span className={fields.help}>{it.repRoleStaffHelp}</span>
          </span>
        </label>
      </fieldset>

      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      {pending ? (
        <p className={fields.help} role="status">
          {it.saving}
        </p>
      ) : null}
      {failed && submitting ? (
        <div className={fields.actions}>
          <Button type="submit" disabled={pending}>
            {it.repRoleSubmit}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
