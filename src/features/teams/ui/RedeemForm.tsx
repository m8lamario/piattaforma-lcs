"use client";

import { useActionState } from "react";
import { redeemInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
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

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
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
      <div className={fields.field}>
        <label className={fields.label} htmlFor="password">
          {it.password}
        </label>
        <input
          id="password"
          name="password"
          className={fields.input}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="confirmPassword">
          {it.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          className={fields.input}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.creatingAccount : it.submitRedeem}
        </Button>
      </div>
    </form>
  );
}
