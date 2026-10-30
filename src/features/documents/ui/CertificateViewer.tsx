"use client";

import { useEffect, useState } from "react";
import { createSignedDocumentUrlAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./CertificateViewer.module.css";

type Props = {
  documentId: string;
  mimeType: string;
  available: boolean;
};

type Phase = { kind: "loading" } | { kind: "ready"; url: string } | { kind: "error" } | { kind: "missing" };

export function CertificateViewer({ documentId, mimeType, available }: Props) {
  const [phase, setPhase] = useState<Phase>(available ? { kind: "loading" } : { kind: "missing" });
  const [attempt, setAttempt] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const image = mimeType === "image/jpeg" || mimeType === "image/png";
  const pdf = mimeType === "application/pdf";

  useEffect(() => {
    if (!available) return;
    let active = true;
    void createSignedDocumentUrlAction(documentId).then((result) => {
      if (!active) return;
      if ("url" in result && result.url) {
        setPhase({ kind: "ready", url: result.url });
        return;
      }
      setPhase({ kind: "error" });
    });
    return () => {
      active = false;
    };
  }, [available, attempt, documentId]);

  if (phase.kind === "missing") {
    return (
      <p className={styles.message} role="status">
        {it.adminReviewFileMissing}
      </p>
    );
  }

  if (phase.kind === "loading") {
    return (
      <p className={styles.message} role="status">
        {it.adminReviewLoading}
      </p>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className={styles.message} role="alert">
        <p>{it.adminReviewFileError}</p>
        <Button type="button" variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
          {it.adminReviewFileRetry}
        </Button>
        <OpenDocumentButton documentId={documentId} />
      </div>
    );
  }

  if (image) {
    return (
      <div className={styles.frame}>
        <div className={styles.toolbar}>
          <Button type="button" variant="secondary" onClick={() => setZoomed((value) => !value)}>
            {zoomed ? it.adminReviewFit : it.adminReviewZoom}
          </Button>
        </div>
        <div className={styles.stage}>
          {/* eslint-disable-next-line @next/next/no-img-element -- il file medico è privato e il link firmato scade: non passa dall'ottimizzatore immagini */}
          <img
            src={phase.url}
            alt={it.adminDocumentTitle}
            className={zoomed ? styles.imageZoom : styles.image}
          />
        </div>
      </div>
    );
  }

  if (pdf) {
    return (
      <iframe className={styles.pdf} src={phase.url} title={it.adminDocumentTitle} />
    );
  }

  return (
    <div className={styles.message}>
      <p>{it.adminReviewFileError}</p>
      <OpenDocumentButton documentId={documentId} />
    </div>
  );
}
