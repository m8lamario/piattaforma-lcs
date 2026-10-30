"use client";

import { useActionState, useEffect } from "react";
import { reviewDocumentAction, type ReviewDocumentQueueSuccess } from "@/features/documents/actions";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import type { ActionFailure } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import styles from "./ReviewForm.module.css";

type Props = {
  documentId: string;
  teamId?: string;
  queueQ?: string;
  queueFlow?: boolean;
  onQueueSuccess?: (result: ReviewDocumentQueueSuccess) => void;
  onQueueAttempt?: () => void;
  onStaleQueue?: () => void;
};

function isQueueSuccess(state: unknown): state is ReviewDocumentQueueSuccess {
  return Boolean(state && typeof state === "object" && "ok" in state && (state as ReviewDocumentQueueSuccess).ok);
}

function isActionFailure(state: unknown): state is ActionFailure {
  return Boolean(state && typeof state === "object" && "error" in state);
}

export function ReviewForm({
  documentId,
  teamId,
  queueQ,
  queueFlow,
  onQueueSuccess,
  onQueueAttempt,
  onStaleQueue,
}: Props) {
  const [approveState, approveAction, approvePending] = useActionState(reviewDocumentAction, undefined);
  const [rejectState, rejectAction, rejectPending] = useActionState(reviewDocumentAction, undefined);
  const busy = approvePending || rejectPending;

  useEffect(() => {
    if (!queueFlow) return;
    if (isQueueSuccess(approveState)) onQueueSuccess?.(approveState);
  }, [approveState, onQueueSuccess, queueFlow]);

  useEffect(() => {
    if (!queueFlow) return;
    if (isQueueSuccess(rejectState)) onQueueSuccess?.(rejectState);
  }, [rejectState, onQueueSuccess, queueFlow]);

  useEffect(() => {
    if (!queueFlow) return;
    const stale =
      (isActionFailure(approveState) && approveState.code === "DOCUMENT_ALREADY_REVIEWED") ||
      (isActionFailure(rejectState) && rejectState.code === "DOCUMENT_ALREADY_REVIEWED");
    if (stale) onStaleQueue?.();
  }, [approveState, rejectState, onStaleQueue, queueFlow]);

  return (
    <div className={styles.stack}>
      <form
        action={approveAction}
        className={styles.stack}
        onSubmit={() => {
          onQueueAttempt?.();
        }}
      >
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="APPROVED" />
        {queueFlow ? <input type="hidden" name="flow" value="queue" /> : null}
        {teamId ? <input type="hidden" name="teamId" value={teamId} /> : null}
        {queueQ ? <input type="hidden" name="queueQ" value={queueQ} /> : null}
        <label className={styles.label} htmlFor="expiresAt">
          {it.adminExpiry}
        </label>
        <input id="expiresAt" name="expiresAt" type="date" className={styles.date} required />
        {isActionFailure(approveState) ? (
          <ActionError error={approveState.error} code={approveState.code} />
        ) : null}
        <PendingSubmitButton
          idle={it.adminApprove}
          pendingLabel={it.loadingApprove}
          variant="success"
          icon="check"
          disabled={busy}
        />
      </form>

      <form
        action={rejectAction}
        className={styles.reject}
        onSubmit={() => {
          onQueueAttempt?.();
        }}
      >
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="REJECTED" />
        {queueFlow ? <input type="hidden" name="flow" value="queue" /> : null}
        {teamId ? <input type="hidden" name="teamId" value={teamId} /> : null}
        {queueQ ? <input type="hidden" name="queueQ" value={queueQ} /> : null}
        <label className={styles.label} htmlFor="reason">
          {it.adminRejectReason}
        </label>
        <textarea id="reason" name="reason" className={styles.textarea} rows={3} required />
        <label className={styles.label} htmlFor="excessHealth">
          <input id="excessHealth" name="excessHealth" type="checkbox" /> {it.medicalExcessReason}
        </label>
        {isActionFailure(rejectState) ? (
          <ActionError error={rejectState.error} code={rejectState.code} />
        ) : null}
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
