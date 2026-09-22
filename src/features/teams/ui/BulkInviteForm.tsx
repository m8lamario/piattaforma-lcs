"use client";

import { useActionState } from "react";
import { bulkInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./InviteForm.module.css";

export function BulkInviteForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(bulkInviteAction, undefined);

  return (
    <section className={styles.card}>
      <h2>{it.bulkInviteTitle}</h2>
      <p>{it.bulkInviteHelp}</p>
      <form action={action} className={fields.form} noValidate aria-busy={pending}>
        <input type="hidden" name="teamId" value={teamId} />
        <div className={fields.field}>
          <label className={fields.label} htmlFor="bulk-csv">
            CSV
          </label>
          <textarea id="bulk-csv" name="csv" className={fields.input} rows={6} required />
        </div>
        {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
        {state?.created ? (
          <p className={fields.help} role="status">
            {it.bulkInviteCreated.replace("{count}", String(state.created))}
          </p>
        ) : null}
        {state?.errors?.length ? (
          <ul className={styles.errors}>
            {state.errors.map((error) => (
              <li key={`${error.line}-${error.message}`}>
                {error.line ? `${it.bulkInviteLine} ${error.line}: ` : null}
                {error.message}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={fields.actions}>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? it.sendingInvite : it.bulkInviteSubmit}
          </Button>
        </div>
      </form>
    </section>
  );
}
