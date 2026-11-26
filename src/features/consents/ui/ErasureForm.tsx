"use client";

import { useActionState, useState } from "react";
import { requestErasureAction } from "@/features/consents/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./ConsentsManager.module.css";

export function ErasureForm() {
  const [eraseState, eraseAction, erasePending] = useActionState(requestErasureAction, undefined);
  const [eraseConfirm, setEraseConfirm] = useState(false);
  return (
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
  );
}
