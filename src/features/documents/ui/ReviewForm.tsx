import { reviewDocumentAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import styles from "./ReviewForm.module.css";

type Props = {
  documentId: string;
  reasonRequired?: boolean;
};

export function ReviewForm({ documentId, reasonRequired }: Props) {
  return (
    <div className={styles.stack}>
      <OpenDocumentButton documentId={documentId} />

      <form action={reviewDocumentAction} className={styles.row}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="APPROVED" />
        <PendingSubmitButton idle={it.adminApprove} pendingLabel={it.loadingApprove} />
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
        <PendingSubmitButton idle={it.adminReject} pendingLabel={it.loadingReject} variant="danger" />
      </form>
    </div>
  );
}
