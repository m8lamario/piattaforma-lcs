"use client";

import { useActionState } from "react";
import { uploadMedicalCertificateAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { MAX_UPLOAD_BYTES } from "@/shared/config/app";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import formStyles from "@/features/registrations/ui/WizardForm.module.css";
import styles from "./MedicalUploadForm.module.css";

type DocumentState = {
  id: string;
  status: string;
  originalFilename: string;
  rejectReason: string | null;
};

type Props = {
  document: DocumentState | null;
};

function statusCopy(status: string) {
  if (status === "APPROVED") return it.medicalApproved;
  if (status === "REJECTED") return it.medicalRejected;
  if (status === "EXPIRED") return it.medicalExpired;
  return it.medicalPending;
}

export function MedicalUploadForm({ document }: Props) {
  const [state, action, pending] = useActionState(uploadMedicalCertificateAction, undefined);
  const mustUpload =
    !document || document.status === "REJECTED" || document.status === "EXPIRED";
  const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

  return (
    <form className={formStyles.form} action={action}>
      {state?.error ? (
        <p className={formStyles.summary} role="alert">
          {state.error}
        </p>
      ) : null}

      <p className={formStyles.help}>{document ? statusCopy(document.status) : it.medicalNone}</p>
      {document?.status === "REJECTED" && document.rejectReason ? (
        <p className={formStyles.help} role="status">
          {it.medicalRejectReason}: {document.rejectReason}
        </p>
      ) : null}

      {document ? (
        <>
          <p className={styles.fileMeta}>{document.originalFilename}</p>
          <OpenDocumentButton documentId={document.id} />
        </>
      ) : null}

      <label className={formStyles.label} htmlFor="file">
        {mustUpload ? it.uploadFile : it.replaceFile}
      </label>
      <input
        id="file"
        name="file"
        className={formStyles.input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        required={mustUpload}
      />
      <p className={formStyles.help}>
        {it.medicalAccept} {maxMb} MB.
      </p>

      <div className={formStyles.actions}>
        <Button type="submit" name="intent" value="continue" disabled={pending}>
          {pending ? "Salvataggio…" : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
