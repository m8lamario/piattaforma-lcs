"use client";

import { useActionState } from "react";
import { joinTeamAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function TeamJoinForm({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(joinTeamAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>{it.teamJoinLead.replace("{team}", teamName)}</p>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="email">
          {it.email}
        </label>
        <input
          id="email"
          name="email"
          className={fields.input}
          type="email"
          required
          autoComplete="email"
        />
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
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.creatingAccount : it.submitRedeem}
        </Button>
      </div>
    </form>
  );
}
