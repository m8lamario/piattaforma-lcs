"use client";

import { useActionState } from "react";
import { resetGuardianAuthorizationAction } from "@/features/admin/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  registrationId: string;
  profileId: string;
  status: "pending" | "authorized" | "refused";
};

const STATUS_COPY: Record<Props["status"], string> = {
  pending: it.statusIN_PROGRESS,
  authorized: it.guardianBoxAuthorized,
  refused: it.guardianBoxRefused,
};

export function ResetGuardianAuthorizationForm({ registrationId, profileId, status }: Props) {
  const [state, action] = useActionState(resetGuardianAuthorizationAction, undefined);
  if (state && "done" in state && state.done) {
    return <p className={`${fields.banner} ${fields.bannerOk}`}>{it.guardianResetDone}</p>;
  }

  return (
    <form className={fields.form} action={action}>
      <h2 className={fields.heading}>{it.guardianResetTitle}</h2>
      <p className={fields.help}>
        {STATUS_COPY[status]}. {it.guardianResetHelp}
      </p>
      {state && "error" in state && state.error ? <ActionError error={state.error} code={state.code} /> : null}
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="profileId" value={profileId} />
      <label className={fields.radio} htmlFor="guardian-reset-confirm">
        <input id="guardian-reset-confirm" type="checkbox" name="confirm" value="on" required />
        {it.guardianResetConfirm}
      </label>
      <PendingSubmitButton idle={it.guardianResetSubmit} pendingLabel={it.guardianResetPending} variant="warning" />
    </form>
  );
}