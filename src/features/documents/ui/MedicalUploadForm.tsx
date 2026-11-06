"use client";

import { useActionState } from "react";
import { uploadMedicalCertificateAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { MAX_UPLOAD_BYTES } from "@/shared/config/app";
import { Button } from "@/shared/ui/Button";
import { FileDropzone } from "@/shared/ui/FileDropzone";
import { ActionError } from "@/shared/ui/ActionError";
import { WizardLaterButton } from "@/features/registrations/ui/WizardShell";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type DocumentState = {
  id: string;
  status: string;
  originalFilename: string;
  rejectReason: string | null;
};

type Props = {
  document: DocumentState | null;
  readOnly?: boolean;
  allowFileOpen?: boolean;
};

function statusBanner(document: DocumentState) {
  if (document.status === "APPROVED") return { copy: it.medicalApproved, className: fields.bannerOk };
  if (document.status === "REJECTED") {
    const reason = document.rejectReason ? ` ${it.medicalRejectReason}: ${document.rejectReason}` : "";
    return { copy: `${it.medicalRejected}${reason}`, className: fields.bannerDanger };
  }
  if (document.status === "EXPIRED") return { copy: it.medicalExpired, className: fields.bannerDanger };
  return { copy: it.medicalPending, className: fields.bannerWarn };
}

export function MedicalUploadForm({ document, readOnly = false, allowFileOpen = true }: Props) {
  const [state, action, pending] = useActionState(uploadMedicalCertificateAction, undefined);
  const mustUpload = !document || document.status === "REJECTED" || document.status === "EXPIRED";
  const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  const banner = document ? statusBanner(document) : { copy: it.medicalNone, className: fields.bannerInfo };

  return (
    <form className={fields.form} action={action} aria-busy={pending}>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      <p className={`${fields.banner} ${banner.className}`} role="status">
        {banner.copy}
      </p>
      {readOnly && !allowFileOpen ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`}>{it.adminViewFileHidden}</p>
      ) : null}

      <div className={fields.bannerStack}>
        <p>{it.medicalCopyNotice}</p>
        <p>{it.medicalPaperNote}</p>
      </div>

      <FileDropzone
        id="file"
        name="file"
        label={mustUpload ? it.uploadFile : it.replaceFile}
        help={`${it.medicalAccept} ${maxMb} MB.`}
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        maxBytes={MAX_UPLOAD_BYTES}
        required={mustUpload && !readOnly}
        disabled={pending || readOnly}
        uploading={pending}
        existingName={document?.originalFilename}
        existingSlot={
          document && allowFileOpen ? <OpenDocumentButton documentId={document.id} /> : null
        }
      />

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="submit" name="intent" value="continue" disabled={pending || readOnly} aria-busy={pending}>
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="submit" name="intent" value="exit" variant="ghost" disabled={pending || readOnly}>
          {it.saveExit}
        </Button>
        <WizardLaterButton />
      </div>
    </form>
  );
}
