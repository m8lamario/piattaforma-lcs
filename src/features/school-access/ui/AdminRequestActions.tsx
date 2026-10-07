"use client";

import { useActionState } from "react";
import {
  approveSchoolAccessAction,
  rejectSchoolAccessAction,
  resendSchoolAccessActivationAction,
} from "@/features/school-access/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Props = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  canResend: boolean;
};

export function AdminRequestActions({ id, status, canResend }: Props) {
  const [approveState, approveAction] = useActionState(approveSchoolAccessAction, undefined);
  const [rejectState, rejectAction] = useActionState(rejectSchoolAccessAction, undefined);
  const [resendState, resendAction] = useActionState(resendSchoolAccessActivationAction, undefined);

  return (
    <div className={fields.form}>
      {status === "PENDING" ? (
        <>
          <form action={approveAction} className={fields.form}>
            <input type="hidden" name="id" value={id} />
            <p className={fields.help}>{it.adminSchoolRequestApproveHelp}</p>
            {approveState?.error ? <ActionError error={approveState.error} code={approveState.code} /> : null}
            <PendingSubmitButton idle={it.adminApprove} pendingLabel={it.saving} variant="success" icon="check" />
          </form>
          <form action={rejectAction} className={fields.form}>
            <input type="hidden" name="id" value={id} />
            <p className={fields.help}>{it.adminSchoolRequestRejectHelp}</p>
            <div className={fields.field}>
              <label className={fields.label} htmlFor="rejectionReason">
                {it.schoolAccessRejectionReason}
              </label>
              <textarea id="rejectionReason" name="rejectionReason" className={fields.textarea} rows={4} />
            </div>
            {rejectState?.error ? <ActionError error={rejectState.error} code={rejectState.code} /> : null}
            <PendingSubmitButton idle={it.adminReject} pendingLabel={it.saving} variant="danger" icon="close" />
          </form>
        </>
      ) : null}
      {canResend ? (
        <form action={resendAction} className={fields.form}>
          <input type="hidden" name="id" value={id} />
          {resendState?.error ? <ActionError error={resendState.error} code={resendState.code} /> : null}
          <PendingSubmitButton
            idle={it.adminSchoolRequestResend}
            pendingLabel={it.adminSchoolRequestResending}
          />
        </form>
      ) : null}
    </div>
  );
}
