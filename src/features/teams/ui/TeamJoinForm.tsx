"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinTeamAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PasswordFields } from "@/shared/ui/PasswordFields";
import { usePasswordConfirmation } from "@/shared/ui/usePasswordConfirmation";
import { ParticipantCategoryField } from "@/features/teams/ui/ParticipantCategoryField";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function TeamJoinForm({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(joinTeamAction, undefined);
  const passwords = usePasswordConfirmation();

  return (
    <form
      action={action}
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        const selected = new FormData(event.currentTarget).get("category");
        // #region agent log
        fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3862ef" },
          body: JSON.stringify({
            sessionId: "3862ef",
            runId: "pre-fix",
            hypothesisId: "B",
            location: "src/features/teams/ui/TeamJoinForm.tsx:onSubmit",
            message: "TeamJoinForm submit category",
            data: {
              hasCategory: typeof selected === "string" && selected.length > 0,
              category: typeof selected === "string" ? selected : String(selected),
              noValidate: true,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => undefined);
        // #endregion
        passwords.onSubmit(event);
      }}
      onChange={passwords.onChange}
    >
      <input type="hidden" name="token" value={token} />
      <p className={fields.help}>{it.teamJoinLead.replace("{team}", teamName)}</p>
      <ParticipantCategoryField />
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
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
      <PasswordFields passwords={passwords} passwordId="password" confirmId="confirmPassword" hintId="password-hint" />
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.creatingAccount : it.submitRedeem}
        </Button>
      </div>
      <p>
        <Link href={`/accedi?next=${encodeURIComponent(`/iscrizione/${token}`)}`} className={fields.textLink}>
          {it.ctaLogin}
        </Link>
      </p>
    </form>
  );
}
