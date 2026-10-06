"use client";

import { useActionState, useState } from "react";
import { submitGuardianRevocationAction } from "@/features/consents/guardianActions";
import { ConsentBoxList } from "@/features/consents/ui/ConsentBoxList";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  token: string;
  playerName: string;
  boxes: ConsentBoxDef[];
};

export function GuardianRevokeForm({ token, playerName, boxes }: Props) {
  const [state, action, pending] = useActionState(submitGuardianRevocationAction, undefined);
  const [values, setValues] = useState<Record<string, boolean>>({});

  if (state && "done" in state && state.done) {
    return (
      <>
        <h1>{it.guardianRevokeTitle}</h1>
        <p className={fields.help}>{it.guardianRevokeDone}</p>
      </>
    );
  }

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      <h1>{it.guardianRevokeTitle}</h1>
      <p className={fields.help}>
        {it.guardianRevokeHelp} {playerName}
      </p>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="token" value={token} />
      <ConsentBoxList
        boxes={boxes}
        values={values}
        disabled={pending}
        grouped
        showHelp={false}
        onToggle={(code, accepted) => setValues((current) => ({ ...current, [code]: accepted }))}
      />
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.guardianRevokeSubmit}
        </Button>
      </div>
    </form>
  );
}
