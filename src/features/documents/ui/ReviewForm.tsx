import { reviewDocumentAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import styles from "./ReviewForm.module.css";

type Props = {
  documentId: string;
  reasonRequired?: boolean;
  expiryRequired?: boolean;
  canOpenFile?: boolean;
};

export function ReviewForm({ documentId, reasonRequired, expiryRequired, canOpenFile = true }: Props) {
  return (
    <div className={styles.stack}>
      {canOpenFile ? <OpenDocumentButton documentId={documentId} /> : null}

      <form action={reviewDocumentAction} className={styles.stack}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="APPROVED" />
        {expiryRequired ? (
          <p className={styles.error} role="alert">
            {it.adminExpiryRequired}
          </p>
        ) : null}
        <label className={styles.label} htmlFor="expiresAt">
          {it.adminExpiry}
        </label>
        <input id="expiresAt" name="expiresAt" type="date" className={styles.date} required />
        <PendingSubmitButton
          idle={it.adminApprove}
          pendingLabel={it.loadingApprove}
          variant="success"
          icon="check"
        />
      </form>

      <form action={reviewDocumentAction} className={styles.reject}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="REJECTED" />
        {reasonRequired ? (
          <p className={styles.error} role="alert">
            {it.adminRejectReasonRequired}
          </p>
        ) : null}
        <label className={styles.label} htmlFor="reason">
          {it.adminRejectReason}
        </label>
        <textarea id="reason" name="reason" className={styles.textarea} rows={4} required />
        <label className={styles.label} htmlFor="excessHealth">
          <input id="excessHealth" name="excessHealth" type="checkbox" /> {it.medicalExcessReason}
        </label>
        <PendingSubmitButton
          idle={it.adminReject}
          pendingLabel={it.loadingReject}
          variant="danger"
          icon="close"
        />
      </form>
    </div>
  );
}
