"use client";

import { useActionState, useState } from "react";
import { requestErasureAction, revokeConsentBoxAction } from "@/features/consents/actions";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { Panel } from "@/shared/ui/Panel";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./ConsentsManager.module.css";

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
  const [eraseConfirm, setEraseConfirm] = useState(false);
  const activeCount = rows.filter((row) => row.active).length;

  return (
    <>
      <Panel
        title={it.consentsChoicesPanel}
        icon="privacy"
        flush
        action={
          <StatusChip tone={activeCount > 0 ? "complete" : "neutral"}>
            {it.consentsActiveCount.replace("{active}", String(activeCount)).replace("{total}", String(rows.length))}
          </StatusChip>
        }
      >
        {revokeState?.error ? (
          <div className={styles.error}>
            <ActionError error={revokeState.error} code={revokeState.code} />
          </div>
        ) : null}
        <ul className={styles.list}>
          {rows.map((row) => {
            const [title, ...rest] = it[row.box.labelKey].split(" — ");
            const detail = rest.join(" — ");
            return (
              <li key={row.box.code} className={`${styles.row} ${row.active ? styles.rowActive : ""}`}>
                <div className={styles.copy}>
                  <span className={styles.code}>{row.box.code}</span>
                  <h3 className={styles.label}>{title}</h3>
                  {detail ? <p className={styles.detail}>{detail}</p> : null}
                  {row.value ? <span className={styles.value}>{row.value}</span> : null}
                </div>
                <div className={styles.side}>
                  <StatusChip tone={row.active ? "complete" : "neutral"}>
                    {row.active ? it.consentsActive : it.consentsInactive}
                  </StatusChip>
                  {row.revocable ? (
                    <form action={revokeAction}>
                      <input type="hidden" name="code" value={row.box.code} />
                      <Button type="submit" variant="quiet" disabled={revokePending}>
                        {revokePending ? it.saving : it.consentsRevoke}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={it.consentsDataPanel} icon="download">
        <p className={fields.help}>{it.consentsExportLead}</p>
        <div className={fields.actions}>
          <ButtonLink href="/area/consensi/export?format=json" variant="secondary" icon="download">
            {it.consentsExportJson}
          </ButtonLink>
          <ButtonLink href="/area/consensi/export?format=txt" variant="secondary" icon="download">
            {it.consentsExportText}
          </ButtonLink>
        </div>

        <form action={eraseAction} className={styles.erasure}>
          <fieldset className={fields.group}>
            <legend className={fields.legend}>{it.consentsErasure}</legend>
            <p className={fields.help}>{it.consentsErasureHelp}</p>
            {eraseState && "done" in eraseState && eraseState.done ? (
              <p className={`${fields.banner} ${fields.bannerOk}`} role="status">
                {it.consentsErasureDone}
              </p>
            ) : null}
            {eraseState?.error ? <ActionError error={eraseState.error} code={eraseState.code} /> : null}
            {eraseConfirm ? (
              <>
                <p className={`${fields.banner} ${fields.bannerDanger}`} role="alert">
                  {it.consentsErasureConfirm}
                </p>
                <input type="hidden" name="confirm" value="1" />
                <div className={fields.actions}>
                  <Button type="submit" variant="danger" disabled={erasePending} aria-busy={erasePending}>
                    {erasePending ? it.saving : it.consentsErasureSubmit}
                  </Button>
                  <Button type="button" variant="ghost" disabled={erasePending} onClick={() => setEraseConfirm(false)}>
                    {it.withdrawConfirmCancel}
                  </Button>
                </div>
              </>
            ) : (
              <div className={fields.actions}>
                <Button type="button" variant="dangerQuiet" onClick={() => setEraseConfirm(true)}>
                  {it.consentsErasure}
                </Button>
              </div>
            )}
          </fieldset>
        </form>
      </Panel>
    </>
  );
}
