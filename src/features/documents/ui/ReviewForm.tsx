"use client";

import { useActionState } from "react";
import { reviewDocumentAction } from "@/features/documents/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import styles from "./ReviewForm.module.css";

type Props = {
  documentId: string;
  teamId?: string;
  queueQ?: string;
};

export function ReviewForm({ documentId, teamId, queueQ }: Props) {
  const [approveState, approveAction, approvePending] = useActionState(reviewDocumentAction, undefined);
  const [rejectState, rejectAction, rejectPending] = useActionState(reviewDocumentAction, undefined);
  const busy = approvePending || rejectPending;

  return (
    <div className={styles.stack}>
      <form action={approveAction} className={styles.stack}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="APPROVED" />
        {teamId ? <input type="hidden" name="teamId" value={teamId} /> : null}
        {queueQ ? <input type="hidden" name="queueQ" value={queueQ} /> : null}
        <label className={styles.label} htmlFor="expiresAt">
          {it.adminExpiry}
        </label>
        <input id="expiresAt" name="expiresAt" type="date" className={styles.date} required />
        {approveState?.error ? <ActionError error={approveState.error} code={approveState.code} /> : null}
        <PendingSubmitButton
          idle={it.adminApprove}
          pendingLabel={it.loadingApprove}
          variant="success"
          icon="check"
          disabled={busy}
        />
      </form>

      <form action={rejectAction} className={styles.reject}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="REJECTED" />
        {teamId ? <input type="hidden" name="teamId" value={teamId} /> : null}
        {queueQ ? <input type="hidden" name="queueQ" value={queueQ} /> : null}
        <label className={styles.label} htmlFor="reason">
          {it.adminRejectReason}
        </label>
        <textarea id="reason" name="reason" className={styles.textarea} rows={3} required />
        <label className={styles.label} htmlFor="excessHealth">
          <input id="excessHealth" name="excessHealth" type="checkbox" /> {it.medicalExcessReason}
        </label>
        {rejectState?.error ? <ActionError error={rejectState.error} code={rejectState.code} /> : null}
        <PendingSubmitButton
          idle={it.adminReject}
          pendingLabel={it.loadingReject}
          variant="danger"
          icon="close"
          disabled={busy}
        />
      </form>
    </div>
  );
}
