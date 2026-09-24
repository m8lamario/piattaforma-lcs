"use client";

import { useActionState } from "react";
import { redeemInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  token: string;
  email: string;
  teamName: string;
  firstName: string | null;
  lastName: string | null;
};

export function RedeemForm({ token, email, teamName, firstName, lastName }: Props) {
  const [state, action, pending] = useActionState(redeemInviteAction, undefined);
  const passwords = usePasswordConfirmation();

  return (
    <form
      action={action}
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={passwords.onSubmit}
      onChange={passwords.onChange}
    >
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>
        {it.inviteRedeemLead.replace("{team}", teamName).replace("{email}", email)}
      </p>
      <div className={fields.pair}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="firstName">
            {it.firstName}
          </label>
          <input
            id="firstName"
            name="firstName"
            className={fields.input}
            required
            defaultValue={firstName ?? ""}
            autoComplete="given-name"
          />
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="lastName">
            {it.lastName}
          </label>
          <input
            id="lastName"
            name="lastName"
            className={fields.input}
            required
            defaultValue={lastName ?? ""}
            autoComplete="family-name"
          />
        </div>
      </div>
      <PasswordFields
        passwords={passwords}
        passwordId="password"
        confirmId="confirmPassword"
        hintId="redeem-password-hint"
      />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.creatingAccount : it.submitRedeem}
        </Button>
      </div>
    </form>
  );
}
