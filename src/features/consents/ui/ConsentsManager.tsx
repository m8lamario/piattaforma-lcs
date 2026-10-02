"use client";

import { useActionState } from "react";
import { requestErasureAction, revokeConsentBoxAction } from "@/features/consents/actions";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./ConsentForm.module.css";

export type ConsentRowView = {
  box: ConsentBoxDef;
  accepted: boolean;
  active: boolean;
  value?: string | null;
  revocable: boolean;
};

type Props = {
  rows: ConsentRowView[];
};

export function ConsentsManager({ rows }: Props) {
  const [revokeState, revokeAction, revokePending] = useActionState(revokeConsentBoxAction, undefined);
  const [eraseState, eraseAction, erasePending] = useActionState(requestErasureAction, undefined);

  return (
    <div className={fields.form}>
      {revokeState?.error ? <ActionError error={revokeState.error} code={revokeState.code} /> : null}
      <ul className={styles.choiceList}>
        {rows.map((row) => (
          <li key={row.box.code} className={styles.choice}>
            <h3>
              {row.box.code} · {it[row.box.labelKey]}
            </h3>
            <p>
              <StatusChip tone={row.active ? "complete" : "neutral"}>
                {row.active ? it.consentsActive : row.accepted ? it.consentsInactive : it.consentsInactive}
              </StatusChip>
              {row.value ? ` ${row.value}` : ""}
            </p>
            {row.revocable ? (
              <form action={revokeAction}>
                <input type="hidden" name="code" value={row.box.code} />
                <Button type="submit" variant="ghost" disabled={revokePending}>
                  {revokePending ? it.saving : it.consentsRevoke}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      <div className={fields.actions}>
        <ButtonLink href="/area/consensi/export?format=json" variant="ghost" icon="download">
          {it.consentsExportJson}
        </ButtonLink>
        <ButtonLink href="/area/consensi/export?format=txt" variant="ghost" icon="download">
          {it.consentsExportText}
        </ButtonLink>
      </div>

      <form action={eraseAction}>
        <fieldset className={fields.group}>
          <legend className={fields.legend}>{it.consentsErasure}</legend>
          <p className={fields.help}>{it.consentsErasureHelp}</p>
          {eraseState && "done" in eraseState && eraseState.done ? (
            <p className={`${fields.banner} ${fields.bannerOk}`}>{it.consentsErasureDone}</p>
          ) : null}
          {eraseState?.error ? <ActionError error={eraseState.error} code={eraseState.code} /> : null}
          <input type="hidden" name="confirm" value="1" />
          <Button type="submit" variant="ghost" disabled={erasePending}>
            {erasePending ? it.saving : it.consentsErasure}
          </Button>
        </fieldset>
      </form>
    </div>
  );
}
