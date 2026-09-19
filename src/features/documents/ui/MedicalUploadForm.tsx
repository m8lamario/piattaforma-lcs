"use client";

import { useActionState } from "react";
import { uploadMedicalCertificateAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { MAX_UPLOAD_BYTES } from "@/shared/config/app";
import { Button } from "@/shared/ui/Button";
import { IndeterminateProgress } from "@/shared/ui/Skeleton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
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

function statusBanner(status: string) {
  if (status === "APPROVED") return { copy: it.medicalApproved, className: fields.bannerOk };
  if (status === "REJECTED") return { copy: it.medicalRejected, className: fields.bannerDanger };
  if (status === "EXPIRED") return { copy: it.medicalExpired, className: fields.bannerDanger };
  return { copy: it.medicalPending, className: fields.bannerWarn };
}

export function MedicalUploadForm({ document }: Props) {
  const [state, action, pending] = useActionState(uploadMedicalCertificateAction, undefined);
  const mustUpload = !document || document.status === "REJECTED" || document.status === "EXPIRED";
  const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  const banner = document ? statusBanner(document.status) : null;

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      {state?.error ? (
        <p className={fields.summary} role="alert">
          {state.error}
        </p>
      ) : null}

      {banner ? (
        <p className={`${fields.banner} ${banner.className}`} role="status">
          {banner.copy}
        </p>
      ) : (
        <p className={`${fields.banner} ${fields.bannerInfo}`}>{it.medicalNone}</p>
      )}

      {document?.status === "REJECTED" && document.rejectReason ? (
        <p className={`${fields.banner} ${fields.bannerDanger}`} role="status">
          {it.medicalRejectReason}: {document.rejectReason}
        </p>
      ) : null}

      {document ? (
        <div className={styles.fileRow}>
          <p className={styles.fileMeta}>{document.originalFilename}</p>
          <OpenDocumentButton documentId={document.id} />
        </div>
      ) : null}

      <div className={fields.field}>
        <label className={fields.label} htmlFor="file">
          {mustUpload ? it.uploadFile : it.replaceFile}
        </label>
        <input
          id="file"
          name="file"
          className={fields.input}
          type="file"
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          required={mustUpload}
          disabled={pending}
        />
        <p className={fields.help}>
          {it.medicalAccept} {maxMb} MB.
        </p>
      </div>
      {pending ? <IndeterminateProgress label={it.loadingUpload} /> : null}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" name="intent" value="continue" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
